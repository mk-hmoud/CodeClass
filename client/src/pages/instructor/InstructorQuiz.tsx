import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Users, CheckCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        return <Badge className="bg-blue-600">Submitted</Badge>;
      case "graded":
        return <Badge className="bg-green-600">Graded</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="border-amber-500 text-amber-400">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const submittedCount = sessions.filter((s) => s.status !== "in_progress").length;
  const scores = sessions
    .filter((s) => s.finalScore != null)
    .map((s) => s.finalScore as number);
  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : "—";

  if (quizLoading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (!quiz) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate(`/instructor/classrooms/${classroomId}/view`)}
          >
            <ArrowLeft size={16} />
            Back to Classroom
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate(`/instructor/classrooms/${classroomId}/quizes/${quizId}/edit`)}
          >
            <Pencil size={16} />
            Edit Quiz
          </Button>
        </div>
        <h1 className="text-3xl font-bold">{quiz.title}</h1>
        {quiz.description && (
          <p className="text-muted-foreground mt-2">{quiz.description}</p>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Clock className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm text-muted-foreground">Time Limit</p>
              <p className="text-2xl font-bold">{quiz.time_limit_minutes} min</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm text-muted-foreground">Submissions</p>
              <p className="text-2xl font-bold">
                {submittedCount} / {sessions.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold">{avgScore}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Problems list */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Problems ({quiz.problems?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(quiz.problems ?? []).length === 0 ? (
            <p className="text-muted-foreground">No problems.</p>
          ) : (
            <div className="space-y-2">
              {quiz.problems.map((p: any, i: number) => (
                <div
                  key={p.quizProblemId}
                  className="flex items-center justify-between p-3 rounded-md border bg-muted/20"
                >
                  <span className="font-medium">
                    {i + 1}. {p.problemTitle}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline">{p.category}</Badge>
                    <span>{p.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Student Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <p className="text-muted-foreground text-center py-4">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No students have started this quiz yet.</p>
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
                        <p className="font-medium">
                          {session.firstName} {session.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{session.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(session.startTime)}</TableCell>
                    <TableCell>{formatDate(session.endTime)}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {session.finalScore != null ? session.finalScore.toFixed(1) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorQuiz;
