import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, BookOpen, Calendar, BarChart2, ArrowLeft, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";

import AssignmentsTab from "@/components/instructor/classroom/AssignmentsTab";
import StudentsTab from "@/components/instructor/classroom/StudentsTab";
import QuizzesTab from "@/components/instructor/classroom/QuizzesTab";

import { getClassroomById } from "@/services/ClassroomService";
import { Classroom } from "@/types/Classroom";

const ACCENTS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#6366f1", "#f97316",
];
const getAccent = (id: number) => ACCENTS[id % ACCENTS.length];

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />
);

interface Student {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: string;
  completionRate: number;
}

const InstructorClassroom = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!classroomId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getClassroomById(parseInt(classroomId, 10));
        setClassroom(data);
        if (data.students) {
          setStudents(data.students.map(s => ({
            id: s.email, name: s.name, email: s.email,
            status: "active", lastActive: s.enrollment_date, completionRate: 75,
          })));
        }
      } catch {
        toast.error("Failed to load classroom");
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId]);

  useEffect(() => {
    if (!loading && !classroom) navigate("/instructor/dashboard");
  }, [loading, classroom, navigate]);

  const handleAssignmentDeleted = (assignmentId: number) => {
    if (!classroom) return;
    setClassroom({ ...classroom, assignments: classroom.assignments.filter(a => a.assignmentId !== assignmentId) });
  };

  const copyCode = () => {
    if (!classroom?.code) return;
    navigator.clipboard.writeText(classroom.code);
    toast.success("Class code copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!classroom) return null;

  const accent = getAccent(classroom.id);

  const TABS = [
    { id: "assignments", label: "Assignments", count: classroom.assignments.length },
    { id: "quizzes", label: "Quizzes", count: null },
    { id: "students", label: "Students", count: classroom.students?.length ?? 0 },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/instructor/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </button>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              {/* Left: identity */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ backgroundColor: accent + "18", color: accent }}
                >
                  {classroom.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{classroom.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users size={13} />{classroom.students?.length ?? 0} students
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={13} />{classroom.assignments.length} assignments
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} />Created {fmtDate(classroom.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 shrink-0">
                {classroom.code && (
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground" />}
                    <span style={{ color: accent }}>{classroom.code}</span>
                  </button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/instructor/classrooms/${classroomId}/analytics`)}
                  className="gap-1.5"
                >
                  <BarChart2 size={14} />
                  Analytics
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto w-full px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border border-border p-1 mb-6">
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                {tab.label}
                {tab.count != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="assignments" className="mt-0">
            <AssignmentsTab
              classroom={classroom}
              onAssignmentDeleted={handleAssignmentDeleted}
            />
          </TabsContent>

          <TabsContent value="quizzes" className="mt-0">
            <QuizzesTab classroomId={parseInt(classroomId!, 10)} />
          </TabsContent>

          <TabsContent value="students" className="mt-0">
            <StudentsTab students={students} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InstructorClassroom;
