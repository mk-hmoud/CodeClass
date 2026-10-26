import React, { useEffect, useMemo, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import "@/lib/monacoConfig";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Lock, Play, Loader2, Check, X, FileCode } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Assignment } from "@/types/Assignment";
import { ProblemFile } from "@/types/Problem";
import { JudgeVerdict } from "@/types/TestCase";
import { submit, getSubmitStatus } from "@/services/JudgeService";

const POLL_MS = 1200;
const MAX_POLLS = Math.ceil(120000 / POLL_MS);

const langFor = (path: string): string => {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".sh")) return "shell";
  return "c"; // .c / .h / Makefile / default
};

/** Multi-file editor for systems problems. Provided (readonly) files are shown
 *  locked; the student edits the template files and submits the whole set. */
const SystemsEditor: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { theme } = useTheme();
  const files: ProblemFile[] = useMemo(
    () => assignment.problem.files ?? [],
    [assignment.problem.files]
  );
  const editablePaths = useMemo(
    () => new Set(files.filter((f) => f.role === "template").map((f) => f.path)),
    [files]
  );

  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Record<string, monaco.editor.ITextModel>>({});
  // live contents of editable files, read at submit time
  const contentsRef = useRef<Record<string, string>>({});

  const [activePath, setActivePath] = useState<string>(
    files.find((f) => f.role === "template")?.path ?? files[0]?.path ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);

  // one model per file, created once
  useEffect(() => {
    if (!hostRef.current || editorRef.current) return;
    for (const f of files) {
      const uri = monaco.Uri.parse(`inmemory://systems/${f.path}`);
      const model =
        monaco.editor.getModel(uri) ??
        monaco.editor.createModel(f.content, langFor(f.path), uri);
      modelsRef.current[f.path] = model;
      if (editablePaths.has(f.path)) {
        contentsRef.current[f.path] = f.content;
        model.onDidChangeContent(() => {
          contentsRef.current[f.path] = model.getValue();
        });
      }
    }
    editorRef.current = monaco.editor.create(hostRef.current, {
      model: modelsRef.current[activePath],
      theme: theme === "dark" ? "vs-dark" : "vs",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
      fontSize: 14,
      lineHeight: 22,
      automaticLayout: true,
      tabSize: 2,
      readOnly: !editablePaths.has(activePath),
      padding: { top: 16, bottom: 16 },
    });
    return () => {
      editorRef.current?.dispose();
      Object.values(modelsRef.current).forEach((m) => m.dispose());
      editorRef.current = null;
      modelsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // switch model + lock state when the active tab changes
  useEffect(() => {
    const ed = editorRef.current;
    const model = modelsRef.current[activePath];
    if (!ed || !model) return;
    ed.setModel(model);
    ed.updateOptions({ readOnly: !editablePaths.has(activePath) });
  }, [activePath, editablePaths]);

  useEffect(() => {
    monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  }, [theme]);

  const handleSubmit = async () => {
    const payload = files
      .filter((f) => editablePaths.has(f.path))
      .map((f) => ({ path: f.path, content: contentsRef.current[f.path] ?? f.content }));
    setIsSubmitting(true);
    setVerdict({ status: "pending" } as JudgeVerdict);
    try {
      const { job_id } = await submit(assignment.assignmentId, "", "c", payload);
      let status: JudgeVerdict;
      let polls = 0;
      do {
        await new Promise((r) => setTimeout(r, POLL_MS));
        status = await getSubmitStatus(job_id);
        setVerdict(status);
        polls += 1;
      } while (status.status === "pending" && polls < MAX_POLLS);
      if (status.status === "pending") {
        toast.error("Still judging — check back in a moment; your submission was recorded.");
      } else if (status.status === "compile_error") {
        toast.error("Build failed — see the error below.");
      } else if (status.status === "completed") {
        const m = status.metrics;
        if (m && m.passedTests === m.totalTests) toast.success("All tests passed! 🎉");
        else toast.warning(`${m?.passedTests ?? 0}/${m?.totalTests ?? 0} tests passed`);
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => setActivePath(f.path)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                f.path === activePath ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <FileCode size={12} />
              {f.path}
              {f.role === "readonly" && <Lock size={10} className="opacity-70" />}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5 shrink-0">
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Submit
        </Button>
      </div>

      <div ref={hostRef} className="flex-1 min-h-[300px]" />

      {verdict && verdict.status !== "pending" && (
        <div className="border-t border-border p-3 max-h-56 overflow-y-auto text-sm">
          {verdict.status === "compile_error" ? (
            <div>
              <p className="font-medium text-destructive mb-1">Build error</p>
              <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                {verdict.error?.fullError || verdict.error?.errorMessage}
              </pre>
            </div>
          ) : (
            <div className="space-y-1">
              {(verdict.testResults ?? []).filter((r) => r.isPublic).map((r) => (
                <div key={r.testCaseId} className="flex items-center gap-2">
                  {r.status === "passed"
                    ? <Check size={13} className="text-success" />
                    : <X size={13} className="text-destructive" />}
                  <span className="text-xs">Test {r.testCaseId}: {r.status}</span>
                  {r.status !== "passed" && r.error && (
                    <span className="text-xs text-muted-foreground truncate">— {r.error}</span>
                  )}
                </div>
              ))}
              {verdict.metrics && (
                <p className="text-xs font-medium pt-1">
                  {verdict.metrics.passedTests}/{verdict.metrics.totalTests} passed
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemsEditor;
