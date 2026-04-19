import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle, BookOpen, GraduationCap, Clock,
  AlertCircle, FileText, Eye, ChevronRight, Zap, Timer,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getClassroomById } from "@/services/ClassroomService";
import { getQuizzesByClassroom, getMySession } from "@/services/QuizService";
import { Classroom } from "@/types/Classroom";
import { Assignment } from "@/types/Assignment";
import { QuizListItem } from "@/types/Quiz";
import { toast } from "sonner";

// ── Accent palette (mirrors StudentDashboard) ─────────────────────────────────
const ACCENTS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#6366f1", "#f97316",
];
const getAccent = (id: number) => ACCENTS[id % ACCENTS.length];

type Filter = "all" | "completed" | "pending";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

const hoursLeft = (d: string) => (new Date(d).getTime() - Date.now()) / 3_600_000;

const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-muted", className)} />
);

// ── Assignment card ───────────────────────────────────────────────────────────
const AssignmentCard = ({
  assignment,
  accent,
  onClick,
}: {
  assignment: Assignment;
  accent: string;
  onClick: () => void;
}) => {
  const submitted = !!assignment.submitted;
  const expired =
    !submitted && !!assignment.dueDate && hoursLeft(assignment.dueDate.toString()) < 0;
  const urgent =
    !submitted && !expired && !!assignment.dueDate && hoursLeft(assignment.dueDate.toString()) < 24;

  const borderColor = submitted ? "#10b981" : expired ? "#ef4444" : urgent ? "#f59e0b" : accent;

  const statusBadge = submitted ? (
    <Badge className="bg-green-500/15 text-green-600 border-green-500/30 border text-[11px]">Completed</Badge>
  ) : expired ? (
    <Badge className="bg-red-500/15 text-red-500 border-red-500/30 border text-[11px]">Expired</Badge>
  ) : urgent ? (
    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border text-[11px]">Due soon</Badge>
  ) : (
    <Badge className="bg-primary/10 text-primary border-primary/20 border text-[11px]">Active</Badge>
  );

  const buttonLabel = submitted
    ? "View Feedback"
    : expired
    ? "View (Late)"
    : "Solve";

  const ButtonIcon = submitted ? FileText : expired ? Eye : ChevronRight;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="group cursor-pointer bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {submitted && <CheckCircle size={14} className="text-green-500 shrink-0" />}
            {expired && <AlertCircle size={14} className="text-red-500 shrink-0" />}
            {urgent && !submitted && <Clock size={14} className="text-amber-500 shrink-0" />}
            <h3 className="font-medium text-sm leading-tight truncate">{assignment.title}</h3>
          </div>
          {statusBadge}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>
            <span className="font-semibold text-foreground">{assignment.points ?? "—"}</span> pts
          </span>
          <span>
            {assignment.dueDate ? fmtDate(assignment.dueDate.toString()) : "No due date"}
          </span>
        </div>

        {/* Grade box (submitted) */}
        {submitted && (
          <div className="rounded-lg bg-green-500/8 border border-green-500/20 px-3 py-2 flex items-center justify-between mb-3">
            <span className="text-xs text-green-600">Grade</span>
            <span className="text-sm font-bold text-green-600">
              {assignment.finalScore != null
                ? `${assignment.finalScore}/${assignment.points}`
                : "Pending"}
            </span>
          </div>
        )}

        {/* Expired notice */}
        {expired && (
          <div className="rounded-lg bg-red-500/8 border border-red-500/20 px-3 py-2 flex items-center gap-2 mb-3">
            <AlertCircle size={13} className="text-red-500 shrink-0" />
            <span className="text-xs text-red-500">
              Overdue by {Math.abs(daysLeft(assignment.dueDate!.toString()))}d
            </span>
          </div>
        )}

        {/* Time remaining */}
        {!submitted && !expired && assignment.dueDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Clock size={12} />
            {urgent
              ? <span className="text-amber-600 font-medium">{Math.round(hoursLeft(assignment.dueDate.toString()))}h left</span>
              : <span>{daysLeft(assignment.dueDate.toString())}d remaining</span>}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div
        className="border-t border-border px-4 py-2.5 flex items-center justify-between transition-colors group-hover:bg-muted/40"
      >
        <span className="text-xs font-medium" style={{ color: borderColor }}>{buttonLabel}</span>
        <ButtonIcon size={13} style={{ color: borderColor }} />
      </div>
    </motion.div>
  );
};

// ── Quiz card ─────────────────────────────────────────────────────────────────
const QuizCard = ({
  quiz,
  status,
  classroomId,
  onNavigate,
}: {
  quiz: QuizListItem;
  status: string | null;
  classroomId: string;
  onNavigate: (path: string) => void;
}) => {
  const path = `/student/classrooms/${classroomId}/quizes/${quiz.quizId}/take`;
  const done = status === "submitted" || status === "graded";
  const inProgress = status === "in_progress";

  return (
    <div className="bg-card border border-primary/20 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200"
      style={{ borderLeftWidth: 3, borderLeftColor: "#8b5cf6" }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-violet-500 shrink-0" />
            <h3 className="font-medium text-sm">{quiz.title}</h3>
          </div>
          {done && <Badge className="bg-green-500/15 text-green-600 border border-green-500/30 text-[11px]">Done</Badge>}
          {inProgress && <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[11px]">In Progress</Badge>}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span><span className="font-semibold text-foreground">{quiz.problemCount}</span> problems</span>
          {quiz.time_limit_minutes && (
            <span className="flex items-center gap-1"><Timer size={11} />{quiz.time_limit_minutes} min</span>
          )}
          {quiz.endDate && <span>Closes {fmtDate(quiz.endDate)}</span>}
        </div>
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <button
          onClick={() => onNavigate(path)}
          className={cn(
            "text-xs font-medium transition-colors",
            done ? "text-green-600" : inProgress ? "text-amber-600" : "text-violet-500"
          )}
        >
          {done ? "View Results" : inProgress ? "Resume Quiz" : "Start Quiz →"}
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const StudentClassroom: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [quizSessions, setQuizSessions] = useState<Record<number, string | null>>({});
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!classroomId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getClassroomById(parseInt(classroomId, 10));
        setClassroom(data);
        try {
          const now = new Date();
          const qData = await getQuizzesByClassroom(parseInt(classroomId, 10));
          const active = qData.filter((q: QuizListItem) => {
            if (!q.isPublished) return false;
            if (q.startDate && now < new Date(q.startDate)) return false;
            if (q.endDate && now > new Date(q.endDate)) return false;
            return true;
          });
          setQuizzes(active);
          const entries = await Promise.all(
            active.map(async (q: QuizListItem) => {
              try {
                const s = await getMySession(q.quizId);
                return [q.quizId, s?.status ?? null] as [number, string | null];
              } catch { return [q.quizId, null] as [number, string | null]; }
            })
          );
          setQuizSessions(Object.fromEntries(entries));
        } catch { /* quizzes optional */ }
      } catch {
        toast.error("Failed to load classroom");
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId]);

  useEffect(() => {
    if (!loading && !classroom) navigate("/student/dashboard");
  }, [loading, classroom, navigate]);

  const filtered = useMemo(() => {
    const all = classroom?.assignments ?? [];
    if (filter === "completed") return all.filter(a => a.submitted);
    if (filter === "pending") return all.filter(a => !a.submitted);
    return all;
  }, [classroom, filter]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  if (!classroom) return null;

  const accent = getAccent(classroom.id);
  const totalAssignments = classroom.assignments.length;
  const completed = classroom.completedAssignments ?? 0;
  const completionPct = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;
  const pending = totalAssignments - completed;

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: totalAssignments },
    { id: "pending", label: "Pending", count: pending },
    { id: "completed", label: "Completed", count: completed },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                style={{ backgroundColor: accent + "20", color: accent }}>
                {classroom.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{classroom.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Instructor: {classroom.instructor ?? "—"}
                </p>
              </div>
            </div>
            {classroom.code && (
              <button
                onClick={() => { navigator.clipboard.writeText(classroom.code!); toast.success("Code copied"); }}
                className="self-start flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <span className="text-muted-foreground">Code:</span>
                <span style={{ color: accent }}>{classroom.code}</span>
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { icon: BookOpen, label: "Assignments", value: totalAssignments, color: accent },
              { icon: CheckCircle, label: "Completed", value: completed, color: "#10b981" },
              { icon: AlertCircle, label: "Pending", value: pending, color: "#f59e0b" },
              { icon: GraduationCap, label: "Completion", value: `${completionPct}%`, color: "#8b5cf6" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="rounded-lg p-2 shrink-0" style={{ backgroundColor: color + "18" }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold leading-tight">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Overall progress</span>
              <span style={{ color: accent }}>{completionPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%`, backgroundColor: accent }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-10">

        {/* Quizzes */}
        {quizzes.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-violet-500" />
              <h2 className="font-semibold text-lg">Active Quizzes</h2>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{quizzes.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {quizzes.map(q => (
                <QuizCard
                  key={q.quizId}
                  quiz={q}
                  status={quizSessions[q.quizId] ?? null}
                  classroomId={classroomId!}
                  onNavigate={navigate}
                />
              ))}
            </div>
          </section>
        )}

        {/* Assignments */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-muted-foreground" />
              <h2 className="font-semibold text-lg">Assignments</h2>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 border border-border self-start">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    filter === f.id
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    filter === f.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl bg-muted/10">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen size={20} className="text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">No assignments</p>
              <p className="text-sm text-muted-foreground">
                {filter === "completed" ? "You haven't completed any assignments yet."
                  : filter === "pending" ? "No pending assignments — great work!"
                  : "No assignments have been posted yet."}
              </p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filtered.map((a, i) => (
                <motion.div
                  key={a.assignmentId}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }}
                >
                  <AssignmentCard
                    assignment={a}
                    accent={accent}
                    onClick={() => navigate(`/student/classrooms/${classroomId}/assignments/${a.assignmentId}/view`)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentClassroom;
