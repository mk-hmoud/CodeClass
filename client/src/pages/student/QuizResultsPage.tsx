import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMySession, getSessionResults } from "@/services/QuizService";

const QuizResultsPage: React.FC = () => {
  const { classroomId, quizId } = useParams<{ classroomId: string; quizId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const sessionIdFromState: number | undefined = state?.sessionId;

  // If no sessionId in router state (e.g. page refresh), look it up via the quiz
  const { data: mySession, isLoading: sessionLoading } = useQuery({
    queryKey: ["mySession", quizId],
    queryFn: () => getMySession(Number(quizId)),
    enabled: !sessionIdFromState && !!quizId,
  });

  const sessionId: number | undefined =
    sessionIdFromState ?? mySession?.session_id ?? undefined;

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["sessionResults", sessionId],
    queryFn: () => getSessionResults(sessionId!),
    enabled: !!sessionId,
  });

  const isLoading = sessionLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-r-transparent rounded-full" />
      </div>
    );
  }

  if (!sessionId || !results) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground mb-4">No results found for this quiz.</p>
        <Button onClick={() => navigate(`/student/classrooms/${classroomId}/view`)}>
          Back to Classroom
        </Button>
      </div>
    );
  }

  const totalPoints = (results.problems ?? []).reduce(
    (sum: number, p: any) => sum + (p.points ?? 0),
    0
  );
  const earnedPoints = results.finalScore ?? 0;
  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  const duration =
    results.start_time && results.end_time
      ? Math.round(
          (new Date(results.end_time).getTime() - new Date(results.start_time).getTime()) / 60000
        )
      : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button
        variant="outline"
        className="flex items-center gap-2 mb-6"
        onClick={() => navigate(`/student/classrooms/${classroomId}/view`)}
      >
        <ArrowLeft size={16} />
        Back to Classroom
      </Button>

      {/* Score hero */}
      <Card className="mb-8 text-center">
        <CardContent className="pt-8 pb-6">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-3xl font-bold mb-1">{results.quizTitle}</h1>
          <p className="text-muted-foreground mb-6">Quiz Completed</p>

          <div className="text-6xl font-bold mb-2">
            {earnedPoints.toFixed(1)}
            <span className="text-2xl text-muted-foreground font-normal">/{totalPoints}</span>
          </div>
          <p className="text-xl text-muted-foreground">{percentage}%</p>

          {duration !== null && (
            <div className="flex items-center justify-center gap-1 mt-4 text-sm text-muted-foreground">
              <Clock size={14} />
              Completed in {duration} minute{duration !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-problem breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Problem Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(results.problems ?? []).map((problem: any, idx: number) => {
            const passed = problem.passedTests ?? 0;
            const total = problem.totalTests ?? 0;
            const allPassed = total > 0 && passed === total;
            const notAttempted = total === 0;

            return (
              <div
                key={problem.quizProblemId ?? idx}
                className="flex items-center gap-4 p-4 rounded-md border bg-muted/20"
              >
                <div className="shrink-0">
                  {notAttempted ? (
                    <div className="h-5 w-5 rounded-full border-2 border-border" />
                  ) : allPassed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {idx + 1}. {problem.problemTitle}
                  </p>
                  {!notAttempted && (
                    <p className="text-sm text-muted-foreground">
                      {passed}/{total} tests passed
                    </p>
                  )}
                  {notAttempted && (
                    <p className="text-sm text-muted-foreground italic">Not attempted</p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-mono font-medium">
                    {problem.autoScore != null ? problem.autoScore.toFixed(1) : "0.0"}
                    <span className="text-muted-foreground font-normal">/{problem.points}</span>
                  </p>
                  {!notAttempted && (
                    <Badge
                      variant="outline"
                      className={
                        allPassed
                          ? "text-green-500 border-green-500 mt-1"
                          : "text-amber-400 border-amber-400 mt-1"
                      }
                    >
                      {allPassed ? "Full marks" : "Partial"}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizResultsPage;
