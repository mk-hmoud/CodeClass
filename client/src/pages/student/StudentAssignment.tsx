import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Clock, Check, BookOpen, Calendar, Tag, Code,
  GraduationCap, RotateCcw, AlertCircle, ChevronRight, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAssignmentById, getRemainingAttempts } from "@/services/AssignmentService";
import { toast } from "sonner";
import { Assignment } from "@/types/Assignment";
import { LANGUAGE_LABELS } from "@/lib/assignmentUtils";

const ACCENTS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#6366f1", "#f97316"];

const fmtDate = (d: string | number | undefined) => {
  if (!d) return "N/A";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

const splitList = (value?: string, delimiter = ";") =>
  value ? value.split(delimiter).map(s => s.trim()).filter(Boolean) : [];

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-muted", className)} />
);

const DIFF_META: Record<string, { color: string; bg: string }> = {
  Easy:   { color: "#10b981", bg: "#10b98115" },
  Medium: { color: "#f59e0b", bg: "#f59e0b15" },
  Hard:   { color: "#ef4444", bg: "#ef444415" },
};

const StudentAssignment = () => {
  const { classroomId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    if (!assignmentId) return;
    (async () => {
      setLoading(true);
      try {
        const raw = await getAssignmentById(parseInt(assignmentId, 10));
        setAssignment({
          ...raw.assignment,
          dueDate: raw.assignment.due_date,
          publishDate: raw.assignment.publish_date,
          due_date: undefined,
          publish_date: undefined,
        });
        const att = await getRemainingAttempts(parseInt(assignmentId, 10));
        setRemainingAttempts(att);
      } catch {
        toast.error("Failed to load assignment");
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId]);

  useEffect(() => {
    if (!loading && !assignment) navigate("/student/dashboard");
  }, [loading, assignment, navigate]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-80" />
          <div className="md:col-span-2"><Skeleton className="h-80" /></div>
        </div>
      </div>
    );
  }

  if (!assignment) return null;

  const dueTs = assignment.dueDate ? new Date(assignment.dueDate).getTime() : null;
  const now = Date.now();
  const msLeft = dueTs ? dueTs - now : null;
  const expired = msLeft !== null && msLeft <= 0;
  const hoursLeft = msLeft ? msLeft / 3_600_000 : null;

  const timeLabel = expired ? "Expired"
    : hoursLeft !== null && hoursLeft < 1 ? `${Math.ceil(hoursLeft * 60)}m left`
    : hoursLeft !== null && hoursLeft < 24 ? `${Math.ceil(hoursLeft)}h left`
    : msLeft !== null ? `${Math.ceil(msLeft / 86_400_000)}d left`
    : null;

  const p = assignment.problem;
  const tagList = splitList(p?.tags, ",");
  const prereqList = splitList(p?.prerequisites);
  const outcomeList = splitList(p?.learning_outcomes);
  const diff = assignment.difficulty_level;
  const diffMeta = diff ? DIFF_META[diff] ?? DIFF_META.Medium : null;
  const accent = ACCENTS[parseInt(classroomId ?? "0", 10) % ACCENTS.length];

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(`/student/classrooms/${classroomId}/view`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft size={15} />
            Back to Classroom
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{assignment.title}</h1>
                {diffMeta && diff && (
                  <Badge
                    className="text-xs border"
                    style={{ backgroundColor: diffMeta.bg, color: diffMeta.color, borderColor: diffMeta.color + "40" }}
                  >
                    {diff}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Zap size={13} /><span className="font-semibold text-foreground">{assignment.points}</span> pts
                </span>
                {assignment.dueDate && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />Due {fmtDate(assignment.dueDate.toString())}
                  </span>
                )}
                {assignment.completed && (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <Check size={13} />Completed
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={() => navigate(`/student/classrooms/${classroomId}/assignments/${assignmentId}/solve`, { state: assignment })}
              className="gap-2 shrink-0"
              disabled={false}
            >
              {assignment.completed ? "Solve Again" : "Start Coding"}
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Status card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</h3>

              {assignment.completed ? (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <Check size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Completed</p>
                    {assignment.finalScore != null && (
                      <p className="text-xs text-muted-foreground">{assignment.finalScore}/{assignment.points} pts</p>
                    )}
                  </div>
                </div>
              ) : expired ? (
                <div className="flex items-center gap-2 text-red-500">
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <AlertCircle size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Expired</p>
                    <p className="text-xs text-muted-foreground">Deadline has passed</p>
                  </div>
                </div>
              ) : timeLabel ? (
                <div className="flex items-center gap-2" style={{ color: hoursLeft && hoursLeft < 24 ? "#f59e0b" : accent }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: (hoursLeft && hoursLeft < 24 ? "#f59e0b" : accent) + "15" }}>
                    <Clock size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{timeLabel}</p>
                    <p className="text-xs text-muted-foreground">Until deadline</p>
                  </div>
                </div>
              ) : null}

              {remainingAttempts !== null && assignment.max_submissions != null && (
                <div className="flex items-center gap-2 pt-2 border-t border-border text-muted-foreground">
                  <RotateCcw size={13} />
                  <span className="text-xs">
                    <span className="font-semibold text-foreground">{remainingAttempts}</span>/{assignment.max_submissions} attempts left
                  </span>
                </div>
              )}
            </div>

            {/* Details card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>

              {assignment.publishDate && (
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Calendar size={13} className="mt-0.5 shrink-0" />
                  <div><p className="text-muted-foreground">Published</p><p className="text-foreground">{fmtDate(assignment.publishDate.toString())}</p></div>
                </div>
              )}

              {assignment.dueDate && (
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock size={13} className="mt-0.5 shrink-0" />
                  <div><p className="text-muted-foreground">Due date</p><p className="text-foreground">{fmtDate(assignment.dueDate.toString())}</p></div>
                </div>
              )}

              {p?.category && (
                <div className="flex items-start gap-2.5 text-xs">
                  <BookOpen size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground mb-1">Category</p>
                    <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/8">{p.category}</Badge>
                  </div>
                </div>
              )}

              {tagList.length > 0 && (
                <div className="flex items-start gap-2.5 text-xs">
                  <Tag size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {tagList.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[11px] border-violet-500/30 text-violet-600 bg-violet-500/8">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {assignment.languages?.length > 0 && (
                <div className="flex items-start gap-2.5 text-xs">
                  <Code size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground mb-1.5">Languages</p>
                    <div className="flex flex-wrap gap-1">
                      {assignment.languages.map((al, i) => {
                        const raw = al.language.name.toLowerCase();
                        const label = LANGUAGE_LABELS[raw] ?? al.language.name;
                        return (
                          <Badge key={i} variant="outline" className="text-[11px] border-green-500/30 text-green-600 bg-green-500/8">
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <Button
              className="w-full gap-2"
              onClick={() => navigate(`/student/classrooms/${classroomId}/assignments/${assignmentId}/solve`, { state: assignment })}
            >
              {assignment.completed ? "Solve Again" : "Start Coding"}
              <ChevronRight size={15} />
            </Button>
          </motion.aside>

          {/* ── Main panel ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="md:col-span-2"
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full min-h-[480px] flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                <div className="border-b border-border px-4 pt-3">
                  <TabsList className="bg-transparent gap-1 p-0 h-auto">
                    {[
                      { id: "description", label: "Problem" },
                      { id: "prerequisites", label: "Prerequisites" },
                      { id: "learning", label: "Outcomes" },
                    ].map(tab => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="rounded-none border-b-2 border-transparent pb-3 pt-1 px-3 text-sm data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <TabsContent value="description" className="flex-1 p-6 mt-0 overflow-y-auto">
                  <h2 className="font-semibold text-lg mb-1">{assignment.title}</h2>
                  {assignment.description ? (
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap mt-3">
                      {assignment.description}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-sm mt-3">No description provided.</p>
                  )}
                </TabsContent>

                <TabsContent value="prerequisites" className="flex-1 p-6 mt-0 overflow-y-auto">
                  <h2 className="font-semibold text-lg mb-4">Prerequisites</h2>
                  {prereqList.length > 0 ? (
                    <ul className="space-y-2.5">
                      {prereqList.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">No prerequisites for this assignment.</p>
                  )}
                </TabsContent>

                <TabsContent value="learning" className="flex-1 p-6 mt-0 overflow-y-auto">
                  <h2 className="font-semibold text-lg mb-4">Learning Outcomes</h2>
                  {outcomeList.length > 0 ? (
                    <ul className="space-y-3">
                      {outcomeList.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                            <GraduationCap size={11} className="text-primary" />
                          </div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">No learning outcomes specified.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignment;
