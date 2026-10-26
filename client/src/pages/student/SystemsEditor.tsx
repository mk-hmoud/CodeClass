import React, { useEffect, useMemo, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import "@/lib/monacoConfig";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Lock, Play, Send, Loader2, Check, X, FileCode } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Assignment } from "@/types/Assignment";
import { ProblemFile } from "@/types/Problem";
import { JudgeVerdict } from "@/types/TestCase";
import { submit, getSubmitStatus, runSystems, getRunStatus } from "@/services/JudgeService";

const POLL_MS = 1200;
const MAX_POLLS = Math.ceil(120000 / POLL_MS);

const langFor = (path: string): string => {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".sh")) return "shell";
  return "c";
};

/** Multi-file editor for systems problems: file tabs (readonly files locked),
 *  a panel showing the public tests, and Run (public tests, no attempt used)
 *  + Submit (graded). */
const SystemsEditor: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { theme } = useTheme();
  const files: ProblemFile[] = useMemo(() => assignment.problem.files ?? [], [assignment.problem.files]);
  const publicTests = useMemo(
    () => (assignment.problem.testCases ?? []).filter((t) => t.isPublic),
    [assignment.problem.testCases]
  );
  const editablePaths = useMemo(
    () => new Set(files.filter((f) => f.role === "template").map((f) => f.path)),
    [files]
  );

  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Record<string, monaco.editor.ITextModel>>({});
  const contentsRef = useRef<Record<string, string>>({});

  const [activePath, setActivePath] = useState<string>(
    files.find((f) => f.role === "template")?.path ?? files[0]?.path ?? ""
  );
  const [busy, setBusy] = useState<null | "run" | "submit">(null);
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
  const [verdictKind, setVerdictKind] = useState<"run" | "submit" | null>(null);

  useEffect(() => {
    if (!hostRef.current || editorRef.current) return;
    for (const f of files) {
      const uri = monaco.Uri.parse(`inmemory://systems/${f.path}`);
      const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(f.content, langFor(f.path), uri);
      modelsRef.current[f.path] = model;
      if (editablePaths.has(f.path)) {
        contentsRef.current[f.path] = f.content;
        model.onDidChangeContent(() => { contentsRef.current[f.path] = model.getValue(); });
      }
    }
    editorRef.current = monaco.editor.create(hostRef.current, {
      model: modelsRef.current[activePath],
      theme: theme === "dark" ? "vs-dark" : "vs",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
      fontSize: 14, lineHeight: 22, automaticLayout: true, tabSize: 2,
      readOnly: !editablePaths.has(activePath),
      padding: { top: 16, bottom: 16 },
    });
    return () => {
      editorRef.current?.dispose();
      Object.values(modelsRef.current).forEach((m) => m.dispose());
      editorRef.current = null; modelsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ed = editorRef.current, model = modelsRef.current[activePath];
    if (!ed || !model) return;
    ed.setModel(model);
    ed.updateOptions({ readOnly: !editablePaths.has(activePath) });
  }, [activePath, editablePaths]);

  useEffect(() => { monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs"); }, [theme]);

  const editableFiles = () =>
    files.filter((f) => editablePaths.has(f.path))
         .map((f) => ({ path: f.path, content: contentsRef.current[f.path] ?? f.content }));

  const poll = async (jobId: string, getStatus: (id: string) => Promise<JudgeVerdict>) => {
    let status: JudgeVerdict; let n = 0;
    do {
      await new Promise((r) => setTimeout(r, POLL_MS));
      status = await getStatus(jobId);
      setVerdict(status);
      n += 1;
    } while (status.status === "pending" && n < MAX_POLLS);
    return status;
  };

  const handleRun = async () => {
    setBusy("run"); setVerdictKind("run"); setVerdict({ status: "pending" } as JudgeVerdict);
    try {
      const { job_id } = await runSystems(assignment.assignmentId, editableFiles());
      const status = await poll(job_id, getRunStatus);
      if (status.status === "compile_error") toast.error("Build failed — see below.");
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Run failed");
    } finally { setBusy(null); }
  };

  const handleSubmit = async () => {
    setBusy("submit"); setVerdictKind("submit"); setVerdict({ status: "pending" } as JudgeVerdict);
    try {
      const { job_id } = await submit(assignment.assignmentId, "", "c", editableFiles());
      const status = await poll(job_id, getSubmitStatus);
      if (status.status === "compile_error") toast.error("Build failed — see below.");
      else if (status.status === "completed") {
        const m = status.metrics;
        if (m && m.passedTests === m.totalTests) toast.success("All tests passed! 🎉");
        else toast.warning(`${m?.passedTests ?? 0}/${m?.totalTests ?? 0} tests passed`);
      }
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Submit failed");
    } finally { setBusy(null); }
  };

  const resultFor = (tcIndex: number) =>
    (verdict?.testResults ?? []).filter((r) => r.isPublic)[tcIndex];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {files.map((f) => (
            <button key={f.path} onClick={() => setActivePath(f.path)}
              className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                f.path === activePath ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              <FileCode size={12} />{f.path}
              {f.role === "readonly" && <Lock size={10} className="opacity-70" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRun} disabled={busy !== null} className="gap-1.5">
            {busy === "run" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={busy !== null} className="gap-1.5">
            {busy === "submit" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
          </Button>
        </div>
      </div>

      <div ref={hostRef} className="flex-1 min-h-[260px]" />

      <div className="border-t border-border p-3 max-h-64 overflow-y-auto text-sm space-y-2">
        {verdict?.status === "compile_error" ? (
          <div>
            <p className="font-medium text-destructive mb-1">Build error</p>
            <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{verdict.error?.fullError || verdict.error?.errorMessage}</pre>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Public tests {verdict?.metrics ? `· ${verdict.metrics.passedTests}/${verdict.metrics.totalTests} passed` : ""}
                {verdictKind === "submit" && verdict?.status === "completed" ? " (submitted)" : ""}
              </span>
              {busy && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
            </div>
            {publicTests.length === 0 && <p className="text-xs text-muted-foreground">No public tests for this problem.</p>}
            {publicTests.map((tc, i) => {
              const res = resultFor(i);
              return (
                <div key={i} className="border border-border rounded-md p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    {res ? (res.status === "passed"
                        ? <Check size={13} className="text-success" />
                        : <X size={13} className="text-destructive" />)
                      : <span className="w-3" />}
                    <span className="font-medium">Test {i + 1}</span>
                    {res && <span className="text-muted-foreground">— {res.status}</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-muted-foreground">
                    <div><span className="opacity-70">stdin</span><pre className="whitespace-pre-wrap">{tc.stdin || "(none)"}</pre></div>
                    <div><span className="opacity-70">expected</span><pre className="whitespace-pre-wrap">{tc.expectedOutput}</pre></div>
                    <div><span className="opacity-70">got</span><pre className="whitespace-pre-wrap">{res?.actual ?? "—"}</pre></div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default SystemsEditor;
