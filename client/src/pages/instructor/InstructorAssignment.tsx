import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical, Trash2, Clock, Calendar, BookOpen,
  BarChart2, ArrowLeft, Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import OverviewTab from "@/components/instructor/assignment/view/OverviewTab";
import ProblemTab from "@/components/instructor/assignment/view/ProblemTab";
import SubmissionsTab from "@/components/instructor/assignment/view/SubmissionsTab";
import ExportTab from "@/components/instructor/assignment/view/ExportTab";
import PlagiarismTab from "@/components/instructor/assignment/view/PlagiarismTab";
import { getAssignmentById } from "@/services/AssignmentService";
import { Assignment } from "@/types/Assignment";
import { FullSubmission } from "@/types/Submission";

const fmtDate = (d?: Date | string | number | null) => {
  if (!d) return "—";
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  } catch { return "—"; }
};

const DIFF_META: Record<string, { color: string }> = {
  Easy:   { color: "#10b981" },
  Medium: { color: "#f59e0b" },
  Hard:   { color: "#ef4444" },
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-muted", className)} />
);

const TABS = [
  { id: "overview",    label: "Overview" },
  { id: "problem",     label: "Problem" },
  { id: "submissions", label: "Submissions" },
  { id: "plagiarism",  label: "Plagiarism" },
  { id: "export",      label: "Export" },
];

const InstructorAssignment: React.FC = () => {
  const { assignmentId, classroomId } = useParams<{ assignmentId: string; classroomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<FullSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) { setError("Invalid assignment ID"); setLoading(false); return; }
    setLoading(true);
    getAssignmentById(+assignmentId)
      .then(raw => {
        if (!raw?.assignment) throw new Error("Assignment not found");
        setAssignment({
          ...raw.assignment,
          dueDate: raw.assignment.due_date,
          publishDate: raw.assignment.publish_date,
          due_date: undefined,
          publish_date: undefined,
        });
        setSubmissions(raw.submissions || []);
      })
      .catch(err => { setError(err.message || "Failed to load assignment"); })
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleBack = () => {
    if (assignment) navigate(`/instructor/classrooms/${assignment.classroomId}/view`);
    else navigate("/instructor/dashboard");
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 text-center">
        <p className="text-muted-foreground mb-4">{error ?? "Assignment not found"}</p>
        <Button variant="outline" onClick={handleBack}>Back</Button>
      </div>
    );
  }

  const diff = assignment.difficulty_level;
  const diffColor = diff ? DIFF_META[diff]?.color : undefined;
  const isExpired = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft size={15} />
            Back to Classroom
          </button>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{assignment.title}</h1>
                  {diff && diffColor && (
                    <Badge
                      className="text-xs border"
                      style={{ backgroundColor: diffColor + "18", color: diffColor, borderColor: diffColor + "40" }}
                    >
                      {diff}
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-border">Expired</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Zap size={13} /><span className="text-foreground font-medium">{assignment.points ?? 0}</span> pts
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />Published: {fmtDate(assignment.publishDate)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />Due: {fmtDate(assignment.dueDate)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={13} />{submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate(`/instructor/classrooms/${classroomId}/assignments/${assignmentId}/analytics`)}
                >
                  <BarChart2 size={14} />Analytics
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical size={15} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 size={13} className="mr-2" />Delete Assignment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto w-full px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border border-border p-1 mb-6 flex-wrap h-auto gap-1">
            {TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              assignment={assignment}
              studentSubmissions={[]}
              onEditAssignment={() => {}}
            />
          </TabsContent>

          <TabsContent value="problem">
            <ProblemTab assignment={assignment} />
          </TabsContent>

          <TabsContent value="submissions">
            <SubmissionsTab
              assignmentScore={assignment.points}
              submissions={submissions}
              formatDate={fmtDate}
              assignmentTitle={assignment.title}
              assignmentDescription={assignment.description}
              gradingType={assignment.grading_method}
            />
          </TabsContent>

          <TabsContent value="plagiarism">
            <PlagiarismTab
              assignmentId={assignmentId || ""}
              plagiarism_detection={assignment.plagiarism_detection}
            />
          </TabsContent>

          <TabsContent value="export">
            <ExportTab assignment={assignment} students={submissions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InstructorAssignment;
