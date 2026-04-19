import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Trophy, Clock, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getMySession, getSessionResults } from "@/services/QuizService";

const QuizResultsPage: React.FC = () => {
  const { classroomId, quizId } = useParams<{ classroomId: string; quizId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const sessionIdFromState: number | undefined = state?.sessionId;

  const { data: mySession, isLoading: sessionLoading } = useQuery({
    queryKey: ["mySession", quizId],
    queryFn: () => getMySession(Number(quizId)),
    enabled: !sessionIdFromState && !!quizId,
  });

  const sessionId: number | undefined = sessionIdFromState ?? mySession?.session_id ?? undefined;

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["sessionResults", sessionId],
    queryFn: () => getSessionResults(sessionId!),
    enabled: !!sessionId,
  });

  const isLoading = sessionLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!sessionId || !results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">No results found for this quiz.</p>
        <Button variant="outline" onClick={() => navigate(`/student/classrooms/${classroomId}/view`)}>
          <ArrowLeft size={15} className="mr-2" />Back to Classroom
        </Button>
      </div>
    );
  }

  const totalPoints = (results.problems ?? []).reduce((s: number, p: any) => s + (p.points ?? 0), 0);
  const earnedPoints = results.finalScore ?? 0;
  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const duration =
    results.start_time && results.end_time
      ? Math.round((new Date(results.end_time).getTime() - new Date(results.start_time).getTime()) / 60000)
      : null;

  const scoreColor =
    percentage >= 80 ? "#10b981" :
    percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-6 py-8">
        <button
          onClick={() => navigate(`/student/classrooms/${classroomId}/view`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          Back to Classroom
        </button>

        {/* Score hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-2xl p-8 text-center mb-6"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: scoreColor + "18" }}
          >
            <Trophy size={28} style={{ color: scoreColor }} />
          </div>

          <h1 className="text-2xl font-bold mb-1">{results.quizTitle}</h1>
          <p className="text-sm text-muted-foreground mb-6">Quiz Completed</p>

          <div className="mb-4">
            <span className="text-5xl font-bold" style={{ color: scoreColor }}>
              {earnedPoints.toFixed(1)}
            </span>
            <span className="text-xl text-muted-foreground">/{totalPoints}</span>
          </div>

          {/* Score bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto mb-3">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${percentage}%`, backgroundColor: scoreColor }}
            />
          </div>
          <p className="text-lg font-semibold" style={{ color: scoreColor }}>{percentage}%</p>

          {duration !== null && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-4">
              <Clock size={14} />
              Completed in {duration} minute{duration !== 1 ? "s" : ""}
            </p>
          )}
        </motion.div>

        {/* Per-problem breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="font-semibold text-sm">Problem Breakdown</h2>
          </div>

          <div className="divide-y divide-border">
            {(results.problems ?? []).map((problem: any, idx: number) => {
              const passed = problem.passedTests ?? 0;
              const total = problem.totalTests ?? 0;
              const allPassed = total > 0 && passed === total;
              const notAttempted = total === 0;
              const score = problem.autoScore ?? 0;

              return (
                <div key={problem.quizProblemId ?? idx} className="flex items-center gap-4 px-5 py-4">
                  <div className="shrink-0">
                    {notAttempted ? (
                      <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center">
                        <Minus size={13} className="text-muted-foreground" />
                      </div>
                    ) : allPassed ? (
                      <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
                        <CheckCircle size={16} className="text-green-500" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
                        <XCircle size={16} className="text-amber-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {idx + 1}. {problem.problemTitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notAttempted ? "Not attempted"
                        : `${passed}/${total} tests passed`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-mono font-semibold">
                      {score.toFixed(1)}
                      <span className="text-muted-foreground font-normal text-xs">/{problem.points}</span>
                    </p>
                    {!notAttempted && (
                      <Badge
                        variant="outline"
                        className={cn("text-[11px] mt-1 border",
                          allPassed
                            ? "text-green-600 border-green-500/30 bg-green-500/8"
                            : "text-amber-600 border-amber-500/30 bg-amber-500/8"
                        )}
                      >
                        {allPassed ? "Full marks" : "Partial"}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResultsPage;
