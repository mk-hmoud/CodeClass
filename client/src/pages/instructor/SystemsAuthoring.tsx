import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileCode } from "lucide-react";
import { toast } from "sonner";

type Role = "template" | "readonly" | "hidden";
interface FileRow { path: string; content: string; role: Role; }
interface TestRow { stdin: string; env: string; expectedOutput: string; isPublic: boolean; compare: "exact" | "unordered"; }

export interface SystemsPayload {
  runtime: "systems";
  buildCommand: string;
  entrypoint: string;
  files: FileRow[];
  testCases: {
    input: string; expectedOutput: string; isPublic: boolean;
    stdin: string; env: Record<string, string>; compare: "exact" | "unordered";
  }[];
}
export interface SystemsAuthoringHandle { getPayload: () => SystemsPayload | null; }

const parseEnv = (text: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const eq = t.indexOf("=");
    if (eq > 0) out[t.slice(0, eq).trim()] = t.slice(eq + 1);
  }
  return out;
};

const SystemsAuthoring = forwardRef<SystemsAuthoringHandle>((_props, ref) => {
  const [buildCommand, setBuildCommand] = useState("gcc main.c -pthread -o app");
  const [entrypoint, setEntrypoint] = useState("./app");
  const [files, setFiles] = useState<FileRow[]>([
    { path: "main.c", content: "#include <stdio.h>\nint main(void){\n  // your code\n  return 0;\n}\n", role: "template" },
  ]);
  const [tests, setTests] = useState<TestRow[]>([
    { stdin: "", env: "", expectedOutput: "", isPublic: true, compare: "exact" },
  ]);

  useImperativeHandle(ref, () => ({
    getPayload: () => {
      if (!buildCommand.trim()) { toast.error("Build command is required"); return null; }
      if (!entrypoint.trim()) { toast.error("Entry point is required"); return null; }
      if (files.length === 0 || !files.some(f => f.role === "template")) {
        toast.error("Add at least one editable (template) file"); return null;
      }
      if (files.some(f => !f.path.trim())) { toast.error("Every file needs a path"); return null; }
      if (tests.some(t => !t.expectedOutput.trim())) { toast.error("Every test needs expected output"); return null; }
      return {
        runtime: "systems",
        buildCommand: buildCommand.trim(),
        entrypoint: entrypoint.trim(),
        files: files.map(f => ({ ...f, path: f.path.trim() })),
        testCases: tests.map(t => ({
          input: "", expectedOutput: t.expectedOutput, isPublic: t.isPublic,
          stdin: t.stdin, env: parseEnv(t.env), compare: t.compare,
        })),
      };
    },
  }), [buildCommand, entrypoint, files, tests]);

  const upFile = (i: number, k: keyof FileRow, v: string) =>
    setFiles(files.map((f, idx) => idx === i ? { ...f, [k]: v } : f));
  const upTest = (i: number, k: keyof TestRow, v: string | boolean) =>
    setTests(tests.map((t, idx) => idx === i ? { ...t, [k]: v } : t));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Build command</Label>
          <Input value={buildCommand} onChange={e => setBuildCommand(e.target.value)} className="mt-1 font-mono text-sm" placeholder="gcc main.c util.c -pthread -o app" />
          <p className="text-xs text-muted-foreground mt-1">Runs in the submission directory. The toolchain has gcc/g++, make, coreutils.</p>
        </div>
        <div>
          <Label>Entry point</Label>
          <Input value={entrypoint} onChange={e => setEntrypoint(e.target.value)} className="mt-1 font-mono text-sm" placeholder="./app" />
          <p className="text-xs text-muted-foreground mt-1">The binary run for each test case.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="flex items-center gap-1.5"><FileCode size={14} /> Files</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setFiles([...files, { path: "", content: "", role: "template" }])}>
            <Plus size={14} /> Add file
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          <b>template</b> = student edits it · <b>readonly</b> = provided, shown, locked · <b>hidden</b> = provided at build time, never shown.
        </p>
        <div className="space-y-3">
          {files.map((f, i) => (
            <div key={i} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input value={f.path} onChange={e => upFile(i, "path", e.target.value)} placeholder="path, e.g. main.c" className="font-mono text-sm" />
                <Select value={f.role} onValueChange={v => upFile(i, "role", v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">template</SelectItem>
                    <SelectItem value="readonly">readonly</SelectItem>
                    <SelectItem value="hidden">hidden</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="ghost" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
              <Textarea value={f.content} onChange={e => upFile(i, "content", e.target.value)} className="font-mono text-xs min-h-[90px]" placeholder="file contents" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Test cases</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setTests([...tests, { stdin: "", env: "", expectedOutput: "", isPublic: false, compare: "exact" }])}>
            <Plus size={14} /> Add test
          </Button>
        </div>
        <div className="space-y-3">
          {tests.map((t, i) => (
            <div key={i} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Test #{i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={t.isPublic} onCheckedChange={c => upTest(i, "isPublic", c === true)} /> Public
                  </label>
                  <Select value={t.compare} onValueChange={v => upTest(i, "compare", v)}>
                    <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">exact</SelectItem>
                      <SelectItem value="unordered">unordered</SelectItem>
                    </SelectContent>
                  </Select>
                  {tests.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTests(tests.filter((_, idx) => idx !== i))}>
                      <Trash2 size={13} className="text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">stdin</Label>
                  <Textarea value={t.stdin} onChange={e => upTest(i, "stdin", e.target.value)} className="mt-1 font-mono text-xs min-h-[60px]" placeholder="fed to the program" />
                </div>
                <div>
                  <Label className="text-xs">env (KEY=VALUE per line)</Label>
                  <Textarea value={t.env} onChange={e => upTest(i, "env", e.target.value)} className="mt-1 font-mono text-xs min-h-[60px]" placeholder="GREETING=RESULT" />
                </div>
                <div>
                  <Label className="text-xs">Expected output</Label>
                  <Textarea value={t.expectedOutput} onChange={e => upTest(i, "expectedOutput", e.target.value)} className="mt-1 font-mono text-xs min-h-[60px]" placeholder="exact stdout" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
SystemsAuthoring.displayName = "SystemsAuthoring";
export default SystemsAuthoring;
