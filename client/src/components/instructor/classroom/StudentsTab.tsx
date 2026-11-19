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
import { Mail, Search, Users, Upload, Download, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { parseRosterCsv, credentialsCsv, downloadCsv, RosterRow } from "@/lib/roster";
import { importClassroomStudents, ImportStudentsResult } from "@/services/ClassroomService";

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
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportStudentsResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openImport = () => {
    setRows(null);
    setResult(null);
    setImportOpen(true);
  };

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
    if (!rows || !classroomId) return;
    setImporting(true);
    try {
      const res = await importClassroomStudents(
        classroomId,
        rows.map((r) => ({ first_name: r.first_name, last_name: r.last_name, student_number: r.student_number }))
      );
      setResult(res);
      toast.success(`Created ${res.createdCount} account${res.createdCount === 1 ? "" : "s"}, enrolled ${res.newlyEnrolled}`);
      onImported?.();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to import students");
    } finally {
      setImporting(false);
    }
  };

  const downloadCredentials = () => {
    if (!result?.credentials.length) return;
    downloadCsv(`credentials-classroom-${classroomId}.csv`, credentialsCsv(result.credentials));
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
                  <a
                    href={`mailto:${s.email}`}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Send email"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <Mail size={13} />
                    </Button>
                  </a>
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
              Upload your roster CSV. Any student who doesn't have an account yet is created
              automatically, and everyone in the file is enrolled in this class. You'll get a
              credentials file for the new accounts to hand out.
            </DialogDescription>
          </DialogHeader>

          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

          {!result && (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="text-sm">
                  {rows ? (
                    <span><span className="font-semibold">{rows.length}</span> student{rows.length === 1 ? "" : "s"} ready to import</span>
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
              {result.credentials.length > 0 ? (
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
                <Button onClick={runImport} disabled={!rows || importing}>
                  {importing ? "Importing…" : rows ? `Import ${rows.length}` : "Import"}
                </Button>
              </>
            ) : (
              <>
                {result.credentials.length > 0 && (
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
    </div>
  );
};

export default StudentsTab;
