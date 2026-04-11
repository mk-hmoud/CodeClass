import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Eye, MoreHorizontal, Trash2, Globe, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getQuizzesByClassroom, deleteQuiz, togglePublishQuiz } from "@/services/QuizService";
import { QuizListItem } from "@/types/Quiz";

interface QuizzesTabProps {
  classroomId: number;
}

const QuizzesTab: React.FC<QuizzesTabProps> = ({ classroomId }) => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQuizzesByClassroom(classroomId);
        setQuizzes(data);
      } catch {
        toast.error("Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classroomId]);

  const handleDelete = async (quizId: number) => {
    try {
      await deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.quizId !== quizId));
      toast.success("Quiz deleted");
    } catch {
      toast.error("Failed to delete quiz");
    }
  };

  const handleTogglePublish = async (quizId: number) => {
    try {
      const result = await togglePublishQuiz(quizId);
      setQuizzes((prev) =>
        prev.map((q) =>
          q.quizId === quizId ? { ...q, isPublished: result.isPublished } : q
        )
      );
      toast.success(result.isPublished ? "Quiz published" : "Quiz unpublished");
    } catch {
      toast.error("Failed to update publish status");
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (quiz: QuizListItem) => {
    if (!quiz.isPublished) {
      return <Badge variant="outline" className="border-gray-500 text-gray-400">Draft</Badge>;
    }
    const now = new Date();
    if (quiz.startDate && now < new Date(quiz.startDate)) {
      return <Badge variant="outline" className="border-amber-500 text-amber-400">Scheduled</Badge>;
    }
    if (quiz.endDate && now > new Date(quiz.endDate)) {
      return <Badge variant="outline" className="border-gray-500 text-gray-400">Ended</Badge>;
    }
    return <Badge className="bg-green-600">Live</Badge>;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Quizzes</h2>
        <Button
          className="gap-2"
          onClick={() => navigate(`/instructor/classrooms/${classroomId}/quizes/create`)}
        >
          <Plus size={16} />
          Create Quiz
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>All Quizzes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-4">Loading...</p>
          ) : quizzes.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No quizzes yet.</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => navigate(`/instructor/classrooms/${classroomId}/quizes/create`)}
              >
                Create your first quiz
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Problems</TableHead>
                  <TableHead>Time Limit</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((quiz) => (
                  <TableRow key={quiz.quizId}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell>{quiz.problemCount}</TableCell>
                    <TableCell>{quiz.time_limit_minutes} min</TableCell>
                    <TableCell>
                      {quiz.startDate || quiz.endDate ? (
                        <span className="text-sm">
                          {formatDate(quiz.startDate) ?? "—"} → {formatDate(quiz.endDate) ?? "—"}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No window</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(quiz)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(`/instructor/classrooms/${classroomId}/quizes/${quiz.quizId}/view`)
                          }
                        >
                          <Eye size={16} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTogglePublish(quiz.quizId)}>
                              {quiz.isPublished ? (
                                <><EyeOff className="mr-2 h-4 w-4" /> Unpublish</>
                              ) : (
                                <><Globe className="mr-2 h-4 w-4" /> Publish</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={() => handleDelete(quiz.quizId)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default QuizzesTab;
