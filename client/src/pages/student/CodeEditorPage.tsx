import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, XCircle, Save, FileCode,
  Clock, AlertTriangle, Play, Send, ChevronRight,
  RotateCcw, Terminal, BookOpen, Loader2, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as monaco from "monaco-editor";
import "@/lib/monacoConfig";
import { TestCase, JudgeVerdict } from "@/types/TestCase";
import { Assignment } from "@/types/Assignment";
import { runCode, getRunStatus, submit, getSubmitStatus } from "@/services/JudgeService";
import { getRemainingAttempts } from "@/services/AssignmentService";
import { getCodeDraft, removeCodeDraft, saveCodeDraft } from "@/utils/CodeDraftManager";
import { LANGUAGE_LABELS } from "@/lib/assignmentUtils";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const POLL_INTERVAL = 1000;
const AUTO_SAVE_INTERVAL = 30000;

const emptyVerdict: JudgeVerdict = {
  status: "pending",
  testResults: [],
  metrics: { passedTests: 0, totalTests: 0, averageRuntime: 0 },
};

type ResultTab = "cases" | "run" | "submit";

const CodeEditorPage = () => {
  const navigate = useNavigate();
  const { classroomId, assignmentId } = useParams();
  const { state = {} } = useLocation();
  const { theme } = useTheme();
  const [assignment] = useState<Assignment | null>(state as Assignment | null);

  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onRunCodeRef = useRef<(src: string) => void>(() => {});

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>("cases");
  const [activeTestCaseId, setActiveTestCaseId] = useState<number>(0);
  const [runVerdict, setRunVerdict] = useState<JudgeVerdict>(emptyVerdict);
  const [submitVerdict, setSubmitVerdict] = useState<JudgeVerdict>(emptyVerdict);
  const [selectedLanguage, setSelectedLanguage] = useState(assignment?.languages?.[0]?.language?.name ?? "");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [descTab, setDescTab] = useState<"description" | "details">("description");

  const supportedLanguages = assignment?.languages?.map((l) => l.language.name) ?? [];
  const initialCodes = assignment?.languages?.map((l) => l.initial_code) ?? [];
  const publicTestCases: TestCase[] = assignment?.problem?.testCases ?? [];

  // ── Monaco setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || monacoInstance.current) return;

    const savedDraft = assignmentId ? getCodeDraft(assignmentId) : null;
    const initialLang = savedDraft?.language ?? selectedLanguage;
    const initialCode = savedDraft?.code ?? initialCodes[0] ?? "";

    if (savedDraft) {
      const idx = supportedLanguages.findIndex((l) => l === savedDraft.language);
      if (idx !== -1) {
        setSelectedLanguage(savedDraft.language);
        toast.info("Loaded your previously saved draft");
      }
    }

    monacoInstance.current = monaco.editor.create(editorRef.current, {
      value: initialCode,
      language: initialLang,
      theme: theme === "dark" ? "vs-dark" : "vs",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 22,
      automaticLayout: true,
      tabSize: 2,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      renderLineHighlight: "gutter",
      bracketPairColorization: { enabled: true },
      scrollbar: { useShadows: false, verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
      padding: { top: 16, bottom: 16 },
    });

    monacoInstance.current.onDidChangeModelContent(() => {
      setSaveStatus("unsaved");
      const value = monacoInstance.current?.getValue() ?? "";
      onRunCodeRef.current(value);
    });

    // Ctrl+Enter = Run, Ctrl+Shift+Enter = Submit
    monacoInstance.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => { if (monacoInstance.current) handleRunCode(); }
    );
    monacoInstance.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => { if (monacoInstance.current) handleSubmitCode(); }
    );

    if (publicTestCases.length > 0) setActiveTestCaseId(publicTestCases[0].testCaseId);

    return () => { monacoInstance.current?.dispose(); monacoInstance.current = null; };
  }, []);

  // Theme sync
  useEffect(() => {
    monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  }, [theme]);

  // Language sync
  useEffect(() => {
    const model = monacoInstance.current?.getModel();
    if (model) monaco.editor.setModelLanguage(model, selectedLanguage);
  }, [selectedLanguage]);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === "unsaved") doSave(true);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saveStatus, selectedLanguage]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);

  // Fetch remaining attempts
  useEffect(() => {
    if (!assignmentId) return;
    getRemainingAttempts(Number(assignmentId))
      .then(setRemainingAttempts)
      .catch(() => {});
  }, [assignmentId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getCode = () => monacoInstance.current?.getValue() ?? "";

  const doSave = (silent = false) => {
    setSaveStatus("saving");
    const success = saveCodeDraft(
      assignmentId, getCode(), selectedLanguage,
      assignment?.dueDate ? new Date(assignment.dueDate) : null,
      assignment?.title, assignment?.classroomId
    );
    setSaveStatus(success ? "saved" : "unsaved");
    if (!silent) {
      if (success) toast.success("Code saved");
      else toast.error("Failed to save code");
    }
  };

  const handleLanguageChange = useCallback((lang: string) => {
    const idx = supportedLanguages.indexOf(lang);
    if (idx !== -1) {
      setSelectedLanguage(lang);
      const newCode = initialCodes[idx];
      if (monacoInstance.current) monacoInstance.current.setValue(newCode);
    }
  }, [supportedLanguages, initialCodes]);

  const handleResetCode = () => {
    const idx = supportedLanguages.indexOf(selectedLanguage);
    const defaultCode = initialCodes[idx] ?? "";
    monacoInstance.current?.setValue(defaultCode);
    toast.info("Code reset to default");
  };

  // ── Run ───────────────────────────────────────────────────────────────────
  const handleRunCode = async () => {
    const src = getCode();
    setIsRunning(true);
    setResultTab("run");
    setRunVerdict({ ...emptyVerdict });

    try {
      const { job_id } = await runCode(src, selectedLanguage, publicTestCases);
      let statusData: JudgeVerdict;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getRunStatus(job_id);
        setRunVerdict(statusData);
      } while (statusData.status === "pending");

      if (statusData.status === "compile_error") {
        toast.error(`Compile error: ${statusData.error?.errorMessage}`);
      } else if (statusData.status === "system_error") {
        toast.error("System error — please try again");
      } else if (statusData.status === "completed" && statusData.metrics) {
        const { passedTests, totalTests } = statusData.metrics;
        if (passedTests === totalTests) toast.success(`All ${totalTests} tests passed!`);
        else toast.warning(`${passedTests}/${totalTests} tests passed`);
        setActiveTestCaseId(publicTestCases[0]?.testCaseId ?? 0);
      }
    } catch {
      toast.error("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmitCode = async () => {
    if (remainingAttempts !== null && remainingAttempts <= 0) {
      toast.error("No submission attempts remaining");
      return;
    }
    setIsSubmitting(true);
    setResultTab("submit");
    setSubmitVerdict({ ...emptyVerdict });

    try {
      const { job_id } = await submit(assignment!.assignmentId, getCode(), selectedLanguage);
      let statusData: JudgeVerdict;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getSubmitStatus(job_id);
        setSubmitVerdict(statusData);
      } while (statusData.status === "pending");

      if (statusData.status === "compile_error") {
        toast.error(`Compile error: ${statusData.error?.errorMessage}`);
      } else if (statusData.status === "completed" && statusData.metrics) {
        removeCodeDraft(assignmentId);
        setSaveStatus("saved");
        const { passedTests, totalTests, privatePassedTests = 0, privateTestsTotal = 0 } = statusData.metrics;
        if (passedTests === totalTests && privatePassedTests === privateTestsTotal) {
          toast.success("All tests passed! 🎉");
        } else {
          toast.warning(`${passedTests}/${totalTests} public, ${privatePassedTests}/${privateTestsTotal} private passed`);
        }
        if (remainingAttempts !== null) setRemainingAttempts((p) => (p ?? 1) - 1);
      }
    } catch {
      toast.error("Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentVerdict = resultTab === "submit" ? submitVerdict : runVerdict;
  const testResults = currentVerdict.testResults ?? [];
  const testsPassed = currentVerdict.metrics?.passedTests ?? 0;
  const totalTests = currentVerdict.metrics?.totalTests ?? 0;
  const activeTestCase = publicTestCases.find((tc) => tc.testCaseId === activeTestCaseId);
  const activeTestResult = testResults.find((r) => r.testCaseId === activeTestCaseId);
  const isWorking = isRunning || isSubmitting;

  const allPassed = totalTests > 0 && testsPassed === totalTests;
  const hasResults = testResults.length > 0;

  // ── Render helpers ────────────────────────────────────────────────────────
  const MonoBlock = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-muted/60 border border-border rounded-md px-3 py-2 font-mono text-sm whitespace-pre-wrap break-all", className)}>
      {children}
    </div>
  );

  const renderAttemptsLabel = () => {
    if (remainingAttempts === null) return null;
    if (remainingAttempts === 0 || remainingAttempts === Infinity) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <FileCode size={12} /> Unlimited
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className={cn("gap-1", remainingAttempts <= 2 && "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30")}
      >
        <FileCode size={12} />
        {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""} left
      </Badge>
    );
  };

  const renderSaveStatus = () => {
    if (saveStatus === "saving") return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 size={11} className="animate-spin" />Saving…</span>;
    if (saveStatus === "saved") return <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCheck size={11} className="text-green-500" />Saved</span>;
    return <span className="text-xs text-amber-500 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" />Unsaved</span>;
  };

  const renderError = () => {
    const err = currentVerdict.error;
    if (!err) return null;
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/20">
          <XCircle size={14} className="text-destructive" />
          <span className="text-sm font-medium text-destructive">
            {currentVerdict.status === "compile_error" ? "Compilation Failed" : "System Error"}
          </span>
        </div>
        <div className="p-3 font-mono text-xs text-destructive whitespace-pre-wrap leading-relaxed">
          {err.errorMessage}
        </div>
        {err.fullError && err.fullError !== err.errorMessage && (
          <details className="border-t border-destructive/20">
            <summary className="cursor-pointer px-3 py-1.5 text-xs text-destructive/70 hover:text-destructive select-none">
              Full output
            </summary>
            <div className="p-3 font-mono text-xs text-destructive/80 whitespace-pre-wrap bg-destructive/5">
              {err.fullError}
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderCasesTab = () => {
    if (currentVerdict.status === "compile_error" || currentVerdict.status === "system_error") return renderError();

    if (isWorking) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-sm">{isRunning ? "Running your code…" : "Submitting…"}</p>
        </div>
      );
    }

    if (resultTab === "submit" && submitVerdict.status === "completed") {
      const metrics = submitVerdict.metrics!;
      const privPassed = metrics.privatePassedTests ?? 0;
      const privTotal = metrics.privateTestsTotal ?? 0;

      return (
        <div className="space-y-4">
          {typeof metrics.averageRuntime === "number" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={12} />
              Avg runtime: <strong>{metrics.averageRuntime} ms</strong>
            </div>
          )}

          {/* Public tests */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Public Tests</p>
            <div className="space-y-1.5">
              {testResults.filter((r) => r.isPublic).map((result, idx) => (
                <div
                  key={result.testCaseId ?? idx}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md border text-sm",
                    result.status === "passed"
                      ? "bg-green-500/5 border-green-500/30 text-green-700 dark:text-green-400"
                      : "bg-red-500/5 border-red-500/30 text-red-700 dark:text-red-400"
                  )}
                >
                  {result.status === "passed"
                    ? <CheckCircle size={14} />
                    : <XCircle size={14} />}
                  <span>Test {idx + 1}</span>
                  <span className="ml-auto text-xs opacity-70 flex items-center gap-1">
                    <Clock size={10} />{result.executionTime}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Private tests */}
          {privTotal > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Private Tests</p>
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span className={cn("font-semibold", privPassed === privTotal ? "text-green-600" : "text-amber-600")}>
                    {privPassed} / {privTotal}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", privPassed === privTotal ? "bg-green-500" : "bg-amber-500")}
                    style={{ width: `${privTotal > 0 ? (privPassed / privTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Run mode — show test case I/O
    return (
      <div className="space-y-3">
        {/* Test case selector pills */}
        <div className="flex flex-wrap gap-1.5">
          {publicTestCases.map((tc, idx) => {
            const result = testResults.find((r) => r.testCaseId === tc.testCaseId);
            const isActive = activeTestCaseId === tc.testCaseId;
            const passed = result?.status === "passed";
            const failed = result && result.status !== "passed";

            return (
              <button
                key={tc.testCaseId}
                onClick={() => setActiveTestCaseId(tc.testCaseId)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : passed
                    ? "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                    : failed
                    ? "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400 hover:bg-red-500/20"
                    : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                )}
              >
                {passed && <CheckCircle size={10} />}
                {failed && <XCircle size={10} />}
                {!result && <div className="w-2 h-2 rounded-full border border-current opacity-50" />}
                Case {idx + 1}
              </button>
            );
          })}
        </div>

        {activeTestCase && (
          <div className="space-y-2.5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Input</p>
              <MonoBlock>{activeTestCase.input || <span className="opacity-40 italic">empty</span>}</MonoBlock>
            </div>

            {activeTestResult ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output</p>
                    {activeTestResult.executionTime !== undefined && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />{activeTestResult.executionTime}ms
                      </span>
                    )}
                  </div>
                  <MonoBlock className={cn(
                    activeTestResult.status === "passed" && "border-green-500/40 bg-green-500/5",
                    activeTestResult.status !== "passed" && activeTestResult.actual && "border-red-500/40 bg-red-500/5",
                  )}>
                    {activeTestResult.actual || (
                      <span className="text-muted-foreground italic">no output</span>
                    )}
                  </MonoBlock>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected</p>
                  <MonoBlock>{activeTestCase.expectedOutput}</MonoBlock>
                </div>

                {/* Verdict chip */}
                <div className={cn(
                  "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
                  activeTestResult.status === "passed"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                )}>
                  {activeTestResult.status === "passed"
                    ? <CheckCircle size={14} />
                    : <XCircle size={14} />}
                  <span className="font-medium">
                    {activeTestResult.status === "passed" ? "Accepted"
                      : activeTestResult.status === "timeout" ? "Time Limit Exceeded"
                      : activeTestResult.status === "runtime_error" ? "Runtime Error"
                      : "Wrong Answer"}
                  </span>
                </div>

                {(activeTestResult.status === "runtime_error" || activeTestResult.status === "error") && activeTestResult.error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                      <AlertTriangle size={11} /> Error details
                    </p>
                    <p className="font-mono text-xs text-destructive/80 whitespace-pre-wrap">{activeTestResult.error}</p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected</p>
                <MonoBlock>{activeTestCase.expectedOutput}</MonoBlock>
              </div>
            )}
          </div>
        )}

        {publicTestCases.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Terminal size={24} className="opacity-30" />
            <p className="text-sm">No public test cases</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <header className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-background">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                onClick={() => navigate(`/student/classrooms/${classroomId}/assignments/${assignmentId}/view`)}>
                <ArrowLeft size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to assignment</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
            <h1 className="font-semibold text-sm truncate">{assignment?.title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderAttemptsLabel()}
            {renderSaveStatus()}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => doSave()}>
                  <Save size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save draft</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* ── Main layout ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">

            {/* ── Left column ─────────────────────────────────────────── */}
            <ResizablePanel defaultSize={38} minSize={22} maxSize={55}>
              <ResizablePanelGroup direction="vertical" className="h-full">

                {/* Description */}
                <ResizablePanel defaultSize={58} minSize={25}>
                  <div className="h-full flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-border shrink-0">
                      <button
                        onClick={() => setDescTab("description")}
                        className={cn("flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
                          descTab === "description" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                      >
                        <BookOpen size={12} />Description
                      </button>
                      <button
                        onClick={() => setDescTab("details")}
                        className={cn("flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
                          descTab === "details" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                      >
                        Details
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      {descTab === "description" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {assignment?.description ? (
                            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground bg-transparent p-0 m-0">
                              {assignment.description}
                            </pre>
                          ) : (
                            <p className="text-muted-foreground italic text-sm">No description provided.</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 text-sm">
                          {assignment?.dueDate && (
                            <div className="flex items-center justify-between py-2 border-b border-border">
                              <span className="text-muted-foreground">Due date</span>
                              <Badge variant="outline" className="text-xs">
                                {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Languages</span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {supportedLanguages.map((l) => (
                                <Badge key={l} variant="secondary" className="text-xs">{LANGUAGE_LABELS[l] ?? l}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Public tests</span>
                            <span className="font-medium">{publicTestCases.length}</span>
                          </div>
                          {remainingAttempts !== null && remainingAttempts !== Infinity && (
                            <div className="flex items-center justify-between py-2">
                              <span className="text-muted-foreground">Remaining attempts</span>
                              <span className="font-medium">{remainingAttempts ?? "∞"}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Test cases / Results */}
                <ResizablePanel defaultSize={42} minSize={22}>
                  <div className="h-full flex flex-col overflow-hidden">
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
                      <Tabs value={resultTab} onValueChange={(v) => setResultTab(v as ResultTab)}>
                        <TabsList className="h-7 bg-transparent gap-0 p-0">
                          <TabsTrigger value="cases" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground rounded">
                            <Terminal size={11} className="mr-1" />Cases
                          </TabsTrigger>
                          <TabsTrigger value="run" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground rounded">
                            <Play size={11} className="mr-1" />Run
                            {runVerdict.status === "completed" && (
                              <span className={cn("ml-1 text-[10px] font-bold", allPassed ? "text-green-500" : "text-red-500")}>
                                {runVerdict.metrics?.passedTests}/{runVerdict.metrics?.totalTests}
                              </span>
                            )}
                          </TabsTrigger>
                          <TabsTrigger value="submit" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground rounded">
                            <Send size={11} className="mr-1" />Submit
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {resultTab === "cases" && hasResults && (
                        <Badge variant={allPassed ? "outline" : "secondary"}
                          className={cn("text-[10px] h-5 px-1.5", allPassed && "border-green-500/50 text-green-600 bg-green-500/10")}>
                          {testsPassed}/{totalTests}
                        </Badge>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                      {renderCasesTab()}
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ── Editor column ────────────────────────────────────────── */}
            <ResizablePanel defaultSize={62} minSize={35}>
              <div className="h-full flex flex-col">

                {/* Editor toolbar */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-background shrink-0">
                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="h-7 w-36 text-xs border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang} className="text-xs">
                          {LANGUAGE_LABELS[lang] ?? lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleResetCode}>
                        <RotateCcw size={13} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset to default code</TooltipContent>
                  </Tooltip>

                  <div className="flex-1" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs gap-1.5 border-border"
                        onClick={handleRunCode}
                        disabled={isWorking}
                      >
                        {isRunning
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Play size={12} className="text-green-500" />}
                        Run
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Run code <kbd className="ml-1 text-[10px] bg-muted px-1 rounded">⌘↵</kbd></TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs gap-1.5"
                        onClick={handleSubmitCode}
                        disabled={isWorking || (remainingAttempts !== null && remainingAttempts !== Infinity && remainingAttempts <= 0)}
                      >
                        {isSubmitting
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Send size={12} />}
                        Submit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Submit <kbd className="ml-1 text-[10px] bg-muted px-1 rounded">⌘⇧↵</kbd></TooltipContent>
                  </Tooltip>
                </div>

                {/* Monaco editor */}
                <div ref={editorRef} className="flex-1" />

                {/* Status bar */}
                <div className="flex items-center gap-4 px-3 py-0.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground shrink-0">
                  <span>{LANGUAGE_LABELS[selectedLanguage] ?? selectedLanguage}</span>
                  <span className="ml-auto">⌘↵ Run · ⌘⇧↵ Submit</span>
                </div>
              </div>
            </ResizablePanel>

          </ResizablePanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CodeEditorPage;
