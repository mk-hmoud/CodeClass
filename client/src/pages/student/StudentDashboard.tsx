import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, Clock, AlertTriangle, GraduationCap, ChevronRight,
  FileCode, Plus, Calendar, CheckCircle, Users, Code2, Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Classroom } from "@/types/Classroom";
import { getClassrooms, joinClassroom } from "@/services/ClassroomService";
import { getUpcomingDeadlines } from "@/services/AssignmentService";
import { getAllCodeDrafts } from "@/utils/CodeDraftManager";
import { getCurrentUser } from "@/services/AuthService";
import { LANGUAGE_LABELS } from "@/lib/assignmentUtils";

// ── Accent palette for classroom cards ───────────────────────────────────────
const ACCENTS = [
  { color: "#3b82f6", name: "blue" },
  { color: "#8b5cf6", name: "violet" },
  { color: "#10b981", name: "emerald" },
  { color: "#f59e0b", name: "amber" },
  { color: "#ef4444", name: "rose" },
  { color: "#06b6d4", name: "cyan" },
  { color: "#6366f1", name: "indigo" },
  { color: "#f97316", name: "orange" },
];

const getAccent = (id: number) => ACCENTS[id % ACCENTS.length];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, custom }: any) => (
  <motion.div variants={fadeUp} custom={custom}
    className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
    <div className="rounded-lg p-2.5 shrink-0" style={{ backgroundColor: color + "20" }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  </motion.div>
);

// ── Classroom card ────────────────────────────────────────────────────────────
const ClassroomCard = ({ classroom, index, onClick }: { classroom: Classroom; index: number; onClick: () => void }) => {
  const accent = getAccent(classroom.id);
  const pending = Number(classroom.uncompletedAssignments ?? 0);
  const completion = classroom.completion ?? 0;

  return (
    <motion.div variants={fadeUp} custom={index}
      onClick={onClick}
      className="group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ borderLeftWidth: 4, borderLeftColor: accent.color }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: accent.color + "18", color: accent.color }}>
              {classroom.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-1">{classroom.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {classroom.instructor ?? "Instructor"}
              </p>
            </div>
          </div>
          {pending > 0 && (
            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}>
              {pending} pending
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress</span>
            <span className="font-medium" style={{ color: accent.color }}>{completion}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${completion}%`, backgroundColor: accent.color }} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen size={12} /> {classroom.totalAssignments ?? 0} assignments
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: accent.color }}>Open classroom</span>
        <ChevronRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" style={{ color: accent.color }} />
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = getCurrentUser();
  const displayName = user?.username ?? "there";

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [classCode, setClassCode] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getClassrooms().then(setClassrooms),
      getUpcomingDeadlines(48).then(setDeadlines),
    ])
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));

    setDrafts(getAllCodeDrafts());
  }, []);

  const totalPending = classrooms.reduce((s, c) => s + Number(c.uncompletedAssignments ?? 0), 0);

  const handleJoin = async () => {
    if (!classCode.trim()) { toast.error("Please enter a class code"); return; }
    setJoining(true);
    try {
      await joinClassroom(classCode.trim());
      setClassrooms(await getClassrooms());
      setClassCode(""); setJoinOpen(false);
      toast.success("Joined classroom!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to join classroom");
    } finally { setJoining(false); }
  };

  const urgencyColor = (due: string) => {
    const h = (new Date(due).getTime() - Date.now()) / 3600000;
    if (h < 0) return { bg: "bg-red-500/10", text: "text-red-600", label: "Overdue" };
    if (h < 6) return { bg: "bg-red-500/10", text: "text-red-600", label: `${Math.round(h)}h left` };
    if (h < 24) return { bg: "bg-amber-500/10", text: "text-amber-600", label: `${Math.round(h)}h left` };
    return { bg: "bg-blue-500/10", text: "text-blue-600", label: `${Math.ceil(h / 24)}d left` };
  };

  return (
    <div className="flex-1 p-6 min-h-0">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-8">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary mb-1">{getGreeting()} 👋</p>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{displayName}</h1>
              <p className="text-muted-foreground text-sm">
                {totalPending > 0
                  ? <>You have <span className="font-semibold text-foreground">{totalPending}</span> pending assignments across <span className="font-semibold text-foreground">{classrooms.length}</span> classroom{classrooms.length !== 1 ? "s" : ""}.</>
                  : <>All caught up! Enrolled in <span className="font-semibold text-foreground">{classrooms.length}</span> classroom{classrooms.length !== 1 ? "s" : ""}.</>
                }
              </p>
            </div>
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shrink-0">
                  <Plus size={16} /> Join Classroom
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Join a Classroom</DialogTitle></DialogHeader>
                <div className="py-4 space-y-2">
                  <Label htmlFor="code">Class Code</Label>
                  <Input id="code" value={classCode} onChange={(e) => setClassCode(e.target.value)}
                    placeholder="e.g. ABC123" className="font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()} />
                  <p className="text-xs text-muted-foreground">Ask your instructor for the class code.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
                  <Button onClick={handleJoin} disabled={joining}>
                    {joining ? "Joining…" : "Join"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <GraduationCap size={180} className="absolute -right-8 -bottom-8 opacity-[0.04] pointer-events-none" />
        </motion.div>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Layers} label="Classrooms" value={classrooms.length} color="#3b82f6" custom={0} />
          <StatCard icon={AlertTriangle} label="Pending" value={totalPending} color="#f59e0b" custom={1} />
          <StatCard icon={Clock} label="Due in 48h" value={deadlines.length} color="#ef4444" custom={2} />
          <StatCard icon={FileCode} label="Saved Drafts" value={drafts.length} color="#8b5cf6" custom={3} />
        </motion.div>

        {/* ── Main content grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Classrooms ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">My Classrooms</h2>
              <span className="text-xs text-muted-foreground">{classrooms.length} enrolled</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse border border-border" />
                ))}
              </div>
            ) : classrooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <BookOpen size={24} className="text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">No classrooms yet</p>
                <p className="text-sm text-muted-foreground mb-4">Join your first classroom with a code from your instructor.</p>
                <Button onClick={() => setJoinOpen(true)} size="sm" className="gap-2">
                  <Plus size={14} /> Join Classroom
                </Button>
              </div>
            ) : (
              <motion.div initial="hidden" animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classrooms.map((c, i) => (
                  <ClassroomCard key={c.id} classroom={c} index={i}
                    onClick={() => navigate(`/student/classrooms/${c.id}/view`, { state: c.totalAssignments })} />
                ))}
              </motion.div>
            )}
          </div>

          {/* ── Right column ───────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Upcoming deadlines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Deadlines</h2>
                <span className="text-xs text-muted-foreground">Next 48h</span>
              </div>
              <div className="space-y-2">
                {deadlines.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <CheckCircle size={24} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                  </div>
                ) : (
                  deadlines.map((d, i) => {
                    const u = urgencyColor(d.dueDate);
                    return (
                      <motion.div key={d.id} variants={fadeUp} custom={i}
                        className="group flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all"
                        onClick={() => navigate(`/student/classrooms/${d.classroomId}/assignments/${d.id}/view`)}>
                        <div className={cn("mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0", u.bg)}>
                          <Clock size={13} className={u.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.course}</p>
                        </div>
                        <span className={cn("shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full", u.bg, u.text)}>
                          {u.label}
                        </span>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            <Separator />

            {/* Saved drafts */}
            {drafts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Continue Working</h2>
                  <span className="text-xs text-muted-foreground">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {drafts.map((draft, i) => (
                    <motion.div key={draft.assignmentId} variants={fadeUp} custom={i}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all"
                      onClick={() => navigate(`/student/classrooms/${draft.classroomId}/assignments/${draft.assignmentId}/solve`)}>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Code2 size={15} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{draft.assignmentTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {LANGUAGE_LABELS[draft.language] ?? draft.language} · {timeAgo(draft.lastSaved)}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
