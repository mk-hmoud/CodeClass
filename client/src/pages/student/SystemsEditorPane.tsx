import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import "@/lib/monacoConfig";
import { Lock, FileCode } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { ProblemFile } from "@/types/Problem";

export interface SystemsEditorPaneHandle {
  getFiles: () => { path: string; content: string }[];
}

const langFor = (path: string): string => {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".sh")) return "shell";
  return "c";
};

/** The editor body for systems problems: a file-tab strip + a multi-file Monaco
 *  (read-only files locked). Exposes the student's edited files. Rendered inside
 *  the standard editor layout, so it carries no toolbar/results of its own. */
const SystemsEditorPane = forwardRef<SystemsEditorPaneHandle, { files: ProblemFile[] }>(
  ({ files }, ref) => {
    const { theme } = useTheme();
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

    useImperativeHandle(ref, () => ({
      getFiles: () =>
        files.filter((f) => editablePaths.has(f.path))
             .map((f) => ({ path: f.path, content: contentsRef.current[f.path] ?? f.content })),
    }), [files, editablePaths]);

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

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/20 overflow-x-auto shrink-0">
          {files.map((f) => (
            <button key={f.path} onClick={() => setActivePath(f.path)}
              className={cn("flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                f.path === activePath ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              <FileCode size={11} />{f.path}
              {f.role === "readonly" && <Lock size={9} className="opacity-70" />}
            </button>
          ))}
        </div>
        <div ref={hostRef} className="flex-1 min-h-0" />
      </div>
    );
  }
);
SystemsEditorPane.displayName = "SystemsEditorPane";
export default SystemsEditorPane;
