import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, XCircle, Save, FileCode,
  Clock, AlertTriangle, Play, Send, ChevronRight,
  RotateCcw, Terminal, BookOpen, Loader2, CheckCheck,
  Image as ImageIcon, ZoomIn, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as monaco from "monaco-editor";
import "@/lib/monacoConfig";
import { TestCase, JudgeVerdict } from "@/types/TestCase";
import { Assignment } from "@/types/Assignment";
import { FullSubmission } from "@/types/Submission";
import { runCode, getRunStatus, submit, getSubmitStatus } from "@/services/JudgeService";
import { getRemainingAttempts, getAssignmentById, getMySubmission } from "@/services/AssignmentService";
import { getCodeDraft, removeCodeDraft, saveCodeDraft } from "@/utils/CodeDraftManager";
import { LANGUAGE_LABELS, normalizeAssignment } from "@/lib/assignmentUtils";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsCompactLayout } from "@/hooks/use-media-query";
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
  const isCompact = useIsCompactLayout();
  // "Start Coding" passes the full assignment via router state (fast path, no
  // request needed). Anything that lands here without it -- a "Continue
  // Working" draft link, a page refresh, a direct/shared URL -- needs to fetch
  // it by id instead, or the editor renders with no language/description/tests.
  const stateAssignment = (state as Assignment | null)?.assignmentId ? (state as Assignment) : null;
  const [assignment, setAssignment] = useState<Assignment | null>(stateAssignment);
  const [assignmentLoading, setAssignmentLoading] = useState(!stateAssignment);
  const [mySubmission, setMySubmission] = useState<FullSubmission | null>(null);
  const [mySubmissionLoading, setMySubmissionLoading] = useState(true);
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onRunCodeRef = useRef<(src: string) => void>(() => {});
  // Monaco's keybindings are registered once, on mount, so they'd otherwise close
  // over stale state (e.g. the language selected at mount time, not whatever the
  // user has since picked). Route them through refs that are kept fresh every
  // render instead of calling the handlers directly.
  const handleRunCodeRef = useRef<() => void>(() => {});
  const handleSubmitCodeRef = useRef<() => void>(() => {});

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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const supportedLanguages = assignment?.languages?.map((l) => l.language.name) ?? [];
  const initialCodes = assignment?.languages?.map((l) => l.initial_code) ?? [];
  const publicTestCases: TestCase[] = assignment?.problem?.testCases ?? [];
  const isImageAssignment = assignment?.problem?.outputType === "image";

  // Fetch the assignment when it wasn't handed to us via navigation state.
  useEffect(() => {
    if (stateAssignment || !assignmentId) return;
    (async () => {
      try {
        const raw = await getAssignmentById(Number(assignmentId));
        if (!raw?.assignment) throw new Error("Assignment not found");
        setAssignment(normalizeAssignment(raw.assignment));
      } catch {
        toast.error("Failed to load assignment");
        navigate(`/student/classrooms/${classroomId}/view`);
      } finally {
        setAssignmentLoading(false);
      }
    })();
    // Intentionally only depends on assignmentId -- this decides once, at
    // mount, whether a fetch is needed based on whatever state was present
    // then; it shouldn't re-run just because setAssignment below updates state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  // Fetch the student's own existing submission (if any) for this assignment --
  // independent of the assignment fetch above, so it runs in parallel rather
  // than waiting on it (both only need assignmentId, which is already known).
  useEffect(() => {
    if (!assignmentId) { setMySubmissionLoading(false); return; }
    getMySubmission(Number(assignmentId))
      .then(setMySubmission)
      .finally(() => setMySubmissionLoading(false));
  }, [assignmentId]);

  // Once the previous submission (if any) is loaded, surface it immediately in
  // the Submit tab so the student doesn't have to press Submit again just to
  // see what they already got.
  useEffect(() => {
    if (mySubmissionLoading || !mySubmission) return;
    setSubmitVerdict(mySubmission.verdict);
    setResultTab("submit");
    // Only meant to run once, when the fetch resolves -- not on every
    // mySubmission update (e.g. after a resubmit, which sets it directly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySubmissionLoading]);

  // ── Monaco setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (assignmentLoading || mySubmissionLoading || !editorRef.current || monacoInstance.current) return;

    const savedDraft = assignmentId ? getCodeDraft(assignmentId) : null;
    // Priority: an in-progress local draft > the student's last submission (so
    // returning to an already-submitted assignment shows what they actually
    // submitted, not blank starter code) > the assignment's starter code.
    const submissionLang = mySubmission
      ? assignment?.languages?.find((l) => l.language.language_id === mySubmission.languageId)?.language.name
      : undefined;
    // selectedLanguage was seeded from navigation state at mount, which is
    // empty on the fetch-by-id path -- fall back to the (by-now-loaded)
    // assignment's first supported language instead of trusting it directly.
    const defaultLang = submissionLang ?? supportedLanguages[0] ?? selectedLanguage;
    const initialLang = savedDraft?.language ?? defaultLang;
    const initialCode = savedDraft?.code ?? mySubmission?.code ?? initialCodes[0] ?? "";

    if (savedDraft) {
      const idx = supportedLanguages.findIndex((l) => l === savedDraft.language);
      if (idx !== -1) {
        setSelectedLanguage(savedDraft.language);
        toast.info("Loaded your previously saved draft");
      }
    } else if (defaultLang && defaultLang !== selectedLanguage) {
      setSelectedLanguage(defaultLang);
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
      () => { if (monacoInstance.current) handleRunCodeRef.current(); }
    );
    monacoInstance.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => { if (monacoInstance.current) handleSubmitCodeRef.current(); }
    );

    if (publicTestCases.length > 0) setActiveTestCaseId(publicTestCases[0].testCaseId);

    return () => { monacoInstance.current?.dispose(); monacoInstance.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentLoading, mySubmissionLoading]);

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
      const { job_id } = await runCode(src, selectedLanguage, publicTestCases, assignment?.problem?.outputType, assignment?.assignmentId);
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
        const { totalTests = 0 } = statusData.metrics;
        if (isImageAssignment) {
          const produced = (statusData.testResults ?? []).filter((r) => r.status === "produced").length;
          if (produced === totalTests) toast.success(`Image produced for all ${totalTests} test case${totalTests === 1 ? "" : "s"}`);
          else toast.warning(`${produced}/${totalTests} test case${totalTests === 1 ? "" : "s"} produced an image`);
        } else {
          const { passedTests } = statusData.metrics;
          if (passedTests === totalTests) toast.success(`All ${totalTests} tests passed!`);
          else toast.warning(`${passedTests}/${totalTests} tests passed`);
        }
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
        if (isImageAssignment) {
          toast.success("Submitted — your instructor will review the output and grade manually.");
        } else {
          const { passedTests, totalTests, privatePassedTests = 0, privateTestsTotal = 0 } = statusData.metrics;
          if (passedTests === totalTests && privatePassedTests === privateTestsTotal) {
            toast.success("All tests passed! 🎉");
          } else {
            toast.warning(`${passedTests}/${totalTests} public, ${privatePassedTests}/${privateTestsTotal} private passed`);
          }
        }
        if (remainingAttempts !== null) setRemainingAttempts((p) => (p ?? 1) - 1);

        // createSubmission deletes-and-replaces server-side, so the previous
        // submission (and any grade/feedback on it) is now gone -- reflect
        // that here so a subsequent resubmit's confirmation dialog (and the
        // "Submitted ..." status line) stay accurate without another fetch.
        const submittedLanguageId = assignment?.languages?.find((l) => l.language.name === selectedLanguage)?.language.language_id;
        setMySubmission((prev) => ({
          submissionId: prev?.submissionId ?? 0,
          studentId: prev?.studentId ?? 0,
          studentName: prev?.studentName ?? "",
          assignmentId: Number(assignmentId),
          languageId: submittedLanguageId ?? prev?.languageId ?? 0,
          code: getCode(),
          submittedAt: new Date().toISOString(),
          passedTests: statusData.metrics.passedTests ?? null,
          totalTests: statusData.metrics.totalTests ?? null,
          gradingStatus: "pending",
          autoScore: null,
          manualScore: null,
          finalScore: null,
          feedback: undefined,
          verdict: statusData,
          plagiarismReports: [],
        }));
      }
    } catch {
      toast.error("Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gate resubmission behind an explicit confirmation whenever a previous
  // submission exists -- createSubmission silently deletes it (and any grade)
  // on resubmit, so the student should know that's about to happen.
  const requestSubmit = () => {
    if (mySubmission) {
      setResubmitConfirmOpen(true);
      return;
    }
    handleSubmitCode();
  };

  const confirmResubmit = () => {
    setResubmitConfirmOpen(false);
    handleSubmitCode();
  };

  useEffect(() => {
    handleRunCodeRef.current = handleRunCode;
    handleSubmitCodeRef.current = requestSubmit;
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentVerdict = resultTab === "submit" ? submitVerdict : runVerdict;
  const testResults = currentVerdict.testResults ?? [];
  const totalTests = currentVerdict.metrics?.totalTests ?? 0;
  const testsPassed = isImageAssignment
    ? testResults.filter((r) => r.status === "produced").length
    : currentVerdict.metrics?.passedTests ?? 0;
  const activeTestCase = publicTestCases.find((tc) => tc.testCaseId === activeTestCaseId);
  const activeTestResult = testResults.find((r) => r.testCaseId === activeTestCaseId);
  const isWorking = isRunning || isSubmitting;

  const allPassed = totalTests > 0 && testsPassed === totalTests;
  const hasResults = testResults.length > 0;
  const runPassedCount = isImageAssignment
    ? (runVerdict.testResults ?? []).filter((r) => r.status === "produced").length
    : runVerdict.metrics?.passedTests ?? 0;

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
        className={cn("gap-1", remainingAttempts <= 2 && "border-warning text-warning bg-warning/10")}
      >
        <FileCode size={12} />
        {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""} left
      </Badge>
    );
  };

  const renderSaveStatus = () => {
    if (saveStatus === "saving") return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 size={11} className="animate-spin" />Saving…</span>;
    if (saveStatus === "saved") return <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCheck size={11} className="text-success" />Saved</span>;
    return <span className="text-xs text-warning flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-warning" />Unsaved</span>;
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
              {testResults.filter((r) => r.isPublic).map((result, idx) => {
                const isImage = result.actual?.startsWith("data:image/");
                return (
                  <div
                    key={result.testCaseId ?? idx}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md border text-sm",
                      isImage
                        ? "bg-muted/40 border-border text-foreground"
                        : result.status === "passed"
                        ? "bg-success/5 border-success/30 text-success"
                        : "bg-destructive/5 border-destructive/30 text-destructive"
                    )}
                  >
                    {isImage ? (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(result.actual!)}
                        className="w-6 h-6 rounded border border-border overflow-hidden bg-checkerboard shrink-0 hover:ring-2 hover:ring-primary/50 transition-shadow"
                      >
                        <img src={result.actual} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
                      </button>
                    ) : result.status === "passed" ? (
                      <CheckCircle size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    <span>Test {idx + 1}</span>
                    {isImage && <span className="text-xs text-muted-foreground">Awaiting review</span>}
                    <span className="ml-auto text-xs opacity-70 flex items-center gap-1">
                      <Clock size={10} />{result.executionTime}ms
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Private tests */}
          {privTotal > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Private Tests</p>
              {isImageAssignment ? (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-info/10 text-info">
                  <ImageIcon size={14} />
                  <span>{privTotal} private test case{privTotal === 1 ? "" : "s"} submitted for manual review</span>
                </div>
              ) : (
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Score</span>
                    <span className={cn("font-semibold", privPassed === privTotal ? "text-success" : "text-warning")}>
                      {privPassed} / {privTotal}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", privPassed === privTotal ? "bg-success" : "bg-warning")}
                      style={{ width: `${privTotal > 0 ? (privPassed / privTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
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
            const isImage = result?.actual?.startsWith("data:image/");
            const passed = !isImage && result?.status === "passed";
            const failed = !isImage && result && result.status !== "passed";

            return (
              <button
                key={tc.testCaseId}
                onClick={() => setActiveTestCaseId(tc.testCaseId)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : isImage
                    ? "bg-info/10 border-info/40 text-info hover:bg-info/20"
                    : passed
                    ? "bg-success/10 border-success/40 text-success hover:bg-success/20"
                    : failed
                    ? "bg-destructive/10 border-destructive/40 text-destructive hover:bg-destructive/20"
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
                  {activeTestResult.actual?.startsWith("data:image/") ? (
                    <button
                      type="button"
                      onClick={() => setLightboxImage(activeTestResult.actual!)}
                      className="group relative w-full border border-border rounded-md p-2 bg-checkerboard flex justify-center hover:border-primary/50 transition-colors"
                    >
                      <img
                        src={activeTestResult.actual}
                        alt="Program output"
                        className="rounded"
                        style={{ minWidth: 120, minHeight: 120, maxWidth: "100%", imageRendering: "pixelated" }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/40 transition-colors rounded-md">
                        <ZoomIn size={20} className="text-foreground opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                      </span>
                    </button>
                  ) : (
                    <MonoBlock className={cn(
                      activeTestResult.status === "passed" && "border-success/40 bg-success/5",
                      activeTestResult.status !== "passed" && activeTestResult.actual && "border-destructive/40 bg-destructive/5",
                    )}>
                      {activeTestResult.actual || (
                        <span className="text-muted-foreground italic">no output</span>
                      )}
                    </MonoBlock>
                  )}
                </div>

                {activeTestResult.actual?.startsWith("data:image/") ? (
                  <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-info/10 text-info">
                    <ImageIcon size={14} />
                    <span className="font-medium">
                      {activeTestResult.status === "produced"
                        ? "Image produced"
                        : "No image produced"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected</p>
                      <MonoBlock>{activeTestCase.expectedOutput}</MonoBlock>
                    </div>

                    {/* Verdict chip */}
                    <div className={cn(
                      "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
                      activeTestResult.status === "passed"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
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
                  </>
                )}

                {(activeTestResult.status === "runtime_error" || activeTestResult.status === "error") && activeTestResult.error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                      <AlertTriangle size={11} /> Error details
                    </p>
                    <p className="font-mono text-xs text-destructive/80 whitespace-pre-wrap">{activeTestResult.error}</p>
                  </div>
                )}
              </>
            ) : assignment?.problem?.outputType === "image" ? (
              <p className="text-xs text-muted-foreground italic">
                Run your code to see the produced image here.
              </p>
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

  if (assignmentLoading || mySubmissionLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm">Loading assignment…</p>
      </div>
    );
  }

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

        {/* ── Existing submission status ─────────────────────────────────── */}
        {mySubmission && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30 text-xs">
            <Send size={11} className="text-muted-foreground" />
            <span className="text-muted-foreground">
              Submitted {new Date(mySubmission.submittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            {mySubmission.gradingStatus === "graded" ? (
              <Badge variant="success" className="text-[10px] h-4 px-1.5">
                {mySubmission.finalScore}/{assignment?.points ?? "—"}
              </Badge>
            ) : mySubmission.gradingStatus === "system graded" ? (
              <Badge className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary border-primary/30 border">
                {mySubmission.autoScore}/{assignment?.points ?? "—"}
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px] h-4 px-1.5">Pending review</Badge>
            )}
          </div>
        )}

        {/* ── Main layout ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction={isCompact ? "vertical" : "horizontal"} className="h-full">

            {/* ── Left column (top, when stacked) ─────────────────────── */}
            <ResizablePanel defaultSize={isCompact ? 45 : 38} minSize={isCompact ? 25 : 22} maxSize={isCompact ? 70 : 55}>
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
                              <span className={cn("ml-1 text-[10px] font-bold", runPassedCount === runVerdict.metrics?.totalTests ? "text-success" : "text-destructive")}>
                                {runPassedCount}/{runVerdict.metrics?.totalTests}
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
                          className={cn("text-[10px] h-5 px-1.5", allPassed && "border-success/50 text-success bg-success/10")}>
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

            {/* ── Editor column (bottom, when stacked) ────────────────── */}
            <ResizablePanel defaultSize={isCompact ? 55 : 62} minSize={isCompact ? 30 : 35}>
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
                          : <Play size={12} className="text-success" />}
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
                        onClick={requestSubmit}
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

      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxImage && (
            <div className="bg-checkerboard rounded-md flex items-center justify-center p-4 max-h-[80vh] overflow-auto">
              <img
                src={lightboxImage}
                alt="Produced output, full size"
                className="rounded shadow-sm"
                style={{ width: "min(640px, 85vw)", height: "auto", imageRendering: "pixelated" }}
              />
            </div>
          )}
          <a
            href={lightboxImage ?? undefined}
            download="output.png"
            className="absolute left-4 top-4 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-background/90 border border-border hover:bg-muted transition-colors"
          >
            <Download size={13} />
            Download
          </a>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resubmitConfirmOpen} onOpenChange={setResubmitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit again?</AlertDialogTitle>
            <AlertDialogDescription>
              {mySubmission && (() => {
                const submittedDate = new Date(mySubmission.submittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                const existingScore = mySubmission.finalScore ?? mySubmission.autoScore ?? mySubmission.manualScore;
                return mySubmission.gradingStatus !== "pending"
                  ? `You already submitted this assignment on ${submittedDate} and it's been graded (${existingScore ?? 0}/${assignment?.points ?? "—"}). Submitting again will permanently delete that grade and feedback, and replace it with a new submission.`
                  : `You already submitted this assignment on ${submittedDate}. Submitting again will replace it.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResubmit}>Submit Again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default CodeEditorPage;
