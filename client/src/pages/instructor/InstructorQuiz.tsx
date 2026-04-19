import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Users, CheckCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getQuizById, getQuizResults } from "@/services/QuizService";
import { QuizSessionResult } from "@/types/Quiz";

const InstructorQuiz: React.FC = () => {
  const { classroomId, quizId } = useParams<{ classroomId: string; quizId: string }>();
  const navigate = useNavigate();

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuizById(Number(quizId)),
    enabled: !!quizId,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<QuizSessionResult[]>({
    queryKey: ["quizResults", quizId],
    queryFn: () => getQuizResults(Number(quizId)),
    enabled: !!quizId,
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-primary/15 text-primary border-primary/30 border text-[11px]">Submitted</Badge>;
      case "graded":
        return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 border text-[11px]">Graded</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-[11px]">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px]">{status}</Badge>;
    }
  };

  const submittedCount = sessions.filter((s) => s.status !== "in_progress").length;
  const scores = sessions
    .filter((s) => s.finalScore != null)
    .map((s) => s.finalScore as number);
  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : "—";

  if (quizLoading) return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4"><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /></div>
      </div>
    </div>
  );
  if (!quiz) return null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
            onClick={() => navigate(`/instructor/classrooms/${classroomId}/view`)}
          >
            <ArrowLeft size={15} />
            Back to Classroom
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-muted-foreground text-sm">{quiz.description}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => navigate(`/instructor/classrooms/${classroomId}/quizes/${quizId}/edit`)}
            >
              <Pencil size={14} />
              Edit Quiz
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 py-6 space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time Limit</p>
            <p className="text-xl font-bold">{quiz.time_limit_minutes} min</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Submissions</p>
            <p className="text-xl font-bold">{submittedCount} / {sessions.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Average Score</p>
            <p className="text-xl font-bold">{avgScore}</p>
          </div>
        </div>
      </div>

      {/* Problems list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Problems ({quiz.problems?.length ?? 0})</h2>
        </div>
        <div className="p-4">
          {(quiz.problems ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No problems.</p>
          ) : (
            <div className="space-y-2">
              {quiz.problems.map((p: any, i: number) => (
                <div
                  key={p.quizProblemId}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                >
                  <span className="font-medium text-sm">
                    {i + 1}. {p.problemTitle}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {p.category && <Badge variant="outline" className="text-[11px]">{p.category}</Badge>}
                    <span className="font-mono text-xs">{p.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student sessions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Student Sessions</h2>
        </div>
        <div>
          {sessionsLoading ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">No students have started this quiz yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.sessionId}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {session.firstName} {session.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{session.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(session.startTime)}</TableCell>
                    <TableCell className="text-sm">{formatDate(session.endTime)}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {session.finalScore != null ? session.finalScore.toFixed(1) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default InstructorQuiz;
