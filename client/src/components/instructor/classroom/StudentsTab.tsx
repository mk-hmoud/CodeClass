import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mail, Search, Users, Upload, Download, UserPlus, KeyRound, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { parseRosterCsv, credentialsCsv, downloadCsv, RosterRow } from "@/lib/roster";
import { importClassroomStudents, resetClassroomStudentPassword, ImportStudentsResult } from "@/services/ClassroomService";

const copyToClipboard = (text: string, label = "Copied") => {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(label),
    () => toast.error("Couldn't copy")
  );
};

interface Student {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: string;
}

interface Props {
  students: Student[];
  classroomId?: number;
  /** Called after a successful import so the parent can reload the roster. */
  onImported?: () => void;
  formatDate?: (date: string) => string;
}

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));

const initial = (name: string) => name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#6366f1", "#f97316"];
const avatarColor = (email: string) => AVATAR_COLORS[email.charCodeAt(0) % AVATAR_COLORS.length];

const StudentsTab: React.FC<Props> = ({ students, classroomId, onImported, formatDate = fmtDate }) => {
  const [search, setSearch] = useState("");

  // ── Import students ─────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<"csv" | "single">("csv");
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [single, setSingle] = useState({ first_name: "", last_name: "", student_number: "" });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportStudentsResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openImport = () => {
    setMode("csv");
    setRows(null);
    setSingle({ first_name: "", last_name: "", student_number: "" });
    setResult(null);
    setImportOpen(true);
  };

  const singleValid =
    single.first_name.trim() !== "" && single.last_name.trim() !== "" && single.student_number.trim() !== "";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseRosterCsv(ev.target?.result as string);
      if (parsed === null || parsed.length === 0) {
        toast.error("Invalid CSV. Header must include: first_name, last_name, student_number");
        return;
      }
      setRows(parsed);
      setResult(null);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runImport = async () => {
    if (!classroomId) return;
    const payload =
      mode === "csv"
        ? (rows ?? []).map((r) => ({ first_name: r.first_name, last_name: r.last_name, student_number: r.student_number }))
        : [{ first_name: single.first_name.trim(), last_name: single.last_name.trim(), student_number: single.student_number.trim() }];
    if (payload.length === 0) return;
    setImporting(true);
    try {
      const res = await importClassroomStudents(classroomId, payload);
      setResult(res);
      toast.success(`Created ${res.createdCount} account${res.createdCount === 1 ? "" : "s"}, enrolled ${res.newlyEnrolled}`);
      onImported?.();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to add students");
    } finally {
      setImporting(false);
    }
  };

  const downloadCredentials = () => {
    if (!result?.credentials.length) return;
    downloadCsv(`credentials-classroom-${classroomId}.csv`, credentialsCsv(result.credentials));
  };

  // ── Reset a student's password ──────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<Student | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const openReset = (s: Student) => {
    setResetTarget(s);
    setNewPassword(null);
  };

  const runReset = async () => {
    if (!resetTarget || !classroomId) return;
    setResetting(true);
    try {
      const res = await resetClassroomStudentPassword(classroomId, resetTarget.email);
      setNewPassword(res.password);
      toast.success("New password issued");
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to reset the password");
    } finally {
      setResetting(false);
    }
  };

  const filtered = students.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Students</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{students.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          {classroomId != null && (
            <Button size="sm" className="gap-1.5" onClick={openImport}>
              <UserPlus size={14} />
              Add Students
            </Button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_auto] px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
            <span>Student</span>
            <span>Enrolled</span>
          </div>

          {filtered.map((s, i) => {
            const color = avatarColor(s.email);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1fr_auto] items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: color + "20", color }}
                  >
                    {initial(s.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <div className="ml-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={`mailto:${s.email}`} title="Send email">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <Mail size={13} />
                      </Button>
                    </a>
                    {classroomId != null && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Reset password"
                        onClick={() => openReset(s)}
                      >
                        <KeyRound size={13} />
                      </Button>
                    )}
                  </div>
                </div>

                <span className="text-xs text-muted-foreground">{formatDate(s.lastActive)}</span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/10">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users size={20} className="text-muted-foreground" />
          </div>
          {search ? (
            <>
              <p className="font-medium mb-1">No match for "{search}"</p>
              <button onClick={() => setSearch("")} className="text-sm text-primary hover:underline">Clear search</button>
            </>
          ) : (
            <>
              <p className="font-medium mb-1">No students enrolled</p>
              <p className="text-sm text-muted-foreground mb-4">Import your roster to create accounts and enroll everyone, or share the class code.</p>
              {classroomId != null && (
                <Button className="gap-1.5" onClick={openImport}>
                  <UserPlus size={15} />
                  Add Students
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Import students dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => !o && !importing && setImportOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add students</DialogTitle>
            <DialogDescription>
              New students are created automatically and everyone is enrolled in this class. You'll
              get the one-time login for any account that was created.
            </DialogDescription>
          </DialogHeader>

          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

          {!result && (
            <div className="space-y-4 py-1">
              {/* Mode toggle */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 w-full">
                {([["csv", "Upload CSV"], ["single", "Add one"]] as const).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 text-sm rounded-md py-1.5 transition-colors ${
                      mode === m ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "csv" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="text-sm">
                      {rows ? (
                        <span><span className="font-semibold">{rows.length}</span> student{rows.length === 1 ? "" : "s"} ready</span>
                      ) : (
                        <span className="text-muted-foreground">No file selected</span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                      <Upload size={14} />
                      {rows ? "Choose another" : "Choose CSV"}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Expected columns</Label>
                    <pre className="mt-1 text-xs bg-muted/60 rounded-md px-3 py-2 overflow-x-auto">{`first_name,last_name,student_number
Ada,Lovelace,23175026
Alan,Turing,23175027`}</pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="sf-first" className="text-xs">First name</Label>
                      <Input id="sf-first" value={single.first_name} onChange={(e) => setSingle({ ...single, first_name: e.target.value })} className="mt-1" placeholder="Ada" />
                    </div>
                    <div>
                      <Label htmlFor="sf-last" className="text-xs">Last name</Label>
                      <Input id="sf-last" value={single.last_name} onChange={(e) => setSingle({ ...single, last_name: e.target.value })} className="mt-1" placeholder="Lovelace" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sf-num" className="text-xs">Student number</Label>
                    <Input id="sf-num" value={single.student_number} onChange={(e) => setSingle({ ...single, student_number: e.target.value })} className="mt-1 font-mono" placeholder="23175026" />
                    <p className="text-xs text-muted-foreground mt-1">Their login will be <span className="font-mono">{(single.student_number.trim() || "<number>")}@eul.edu.tr</span>.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3 py-1">
              <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                <div><span className="font-semibold text-success">{result.createdCount}</span> new account{result.createdCount === 1 ? "" : "s"} created</div>
                <div><span className="font-semibold">{result.newlyEnrolled}</span> newly enrolled in this class</div>
                {result.alreadyExisted > 0 && (
                  <div className="text-muted-foreground">{result.alreadyExisted} already had accounts (enrolled, unchanged)</div>
                )}
              </div>

              {result.credentials.length === 1 ? (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{result.credentials[0].first_name} {result.credentials[0].last_name}</p>
                  <p className="text-xs text-muted-foreground">{result.credentials[0].email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted/60 rounded px-2 py-1 font-mono">{result.credentials[0].password}</code>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(result.credentials[0].password, "Password copied")} title="Copy password">
                      <Copy size={14} />
                    </Button>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-2">Shown only once — copy it now.</p>
                </div>
              ) : result.credentials.length > 1 ? (
                <div className="rounded-lg bg-amber-500/8 border border-amber-500/25 p-3 text-xs text-amber-700 dark:text-amber-500">
                  Download the credentials now — the generated passwords are shown only once and can't be recovered later.
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No new accounts were created; everyone already existed and is enrolled.</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!result ? (
              <>
                <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button>
                <Button
                  onClick={runImport}
                  disabled={importing || (mode === "csv" ? !rows : !singleValid)}
                >
                  {importing
                    ? "Adding…"
                    : mode === "csv"
                    ? rows ? `Add ${rows.length}` : "Add"
                    : "Add student"}
                </Button>
              </>
            ) : (
              <>
                {result.credentials.length > 1 && (
                  <Button variant="outline" className="gap-1.5" onClick={downloadCredentials}>
                    <Download size={14} />
                    Download credentials
                  </Button>
                )}
                <Button onClick={() => setImportOpen(false)}>Done</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && !resetting && setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {newPassword
                ? "A new one-time password was issued. Copy it now — it's shown only once."
                : <>Issue a new password for <span className="font-medium text-foreground">{resetTarget?.name}</span>? Their current password will stop working immediately.</>}
            </DialogDescription>
          </DialogHeader>

          {resetTarget && (
            <div className="py-1">
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{resetTarget.name}</p>
                <p className="text-xs text-muted-foreground">{resetTarget.email}</p>
                {newPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted/60 rounded px-2 py-1 font-mono">{newPassword}</code>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(newPassword, "Password copied")} title="Copy password">
                      <Copy size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {!newPassword ? (
              <>
                <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>Cancel</Button>
                <Button onClick={runReset} disabled={resetting} className="gap-1.5">
                  <KeyRound size={14} />
                  {resetting ? "Resetting…" : "Reset password"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setResetTarget(null)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsTab;
