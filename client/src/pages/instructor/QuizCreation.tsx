import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuizDetailsSection from "@/components/instructor/quiz/creation/QuizDetailsSection";
import QuizProblemsSection from "@/components/instructor/quiz/creation/QuizProblemsSection";
import QuizSettingsSection from "@/components/instructor/quiz/creation/QuizSettingsSection";
import QuizPreviewSection from "@/components/instructor/quiz/creation/QuizPreviewSection";

import { createQuiz, getQuizById, updateQuiz } from "@/services/QuizService";
import { Problem } from "@/types/Problem";
import { QuizCreationData, QuizUpdateData, quizFormSchema, QuizFormValues } from "@/types/Quiz";

const QuizCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { classroomId, quizId } = useParams<{ classroomId: string; quizId?: string }>();
  const isEditMode = !!quizId;
  const [activeTab, setActiveTab] = useState("details");
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([]);

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      title: "",
      description: "",
      time_limit_minutes: 60,
      shuffleProblems: false,
      problems: [],
    },
  });

  // Fetch existing quiz in edit mode
  const { data: existingQuiz } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuizById(Number(quizId)),
    enabled: isEditMode,
  });

  // Pre-populate form when quiz data loads
  useEffect(() => {
    if (!existingQuiz) return;

    const parseDate = (dateStr: string | null | undefined) =>
      dateStr ? new Date(dateStr) : undefined;
    const parseTime = (dateStr: string | null | undefined) => {
      if (!dateStr) return undefined;
      const d = new Date(dateStr);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    form.reset({
      title: existingQuiz.title ?? "",
      description: existingQuiz.description ?? "",
      time_limit_minutes: existingQuiz.time_limit_minutes ?? 60,
      shuffleProblems: existingQuiz.shuffle_problems ?? false,
      startDate: parseDate(existingQuiz.start_date),
      startTime: parseTime(existingQuiz.start_date),
      endDate: parseDate(existingQuiz.end_date),
      endTime: parseTime(existingQuiz.end_date),
      problems: (existingQuiz.problems ?? []).map((p: any) => ({
        problemId: p.problemId,
        points: p.points,
      })),
    });

    // Populate selectedProblems for the problems panel
    setSelectedProblems(
      (existingQuiz.problems ?? []).map((p: any) => ({
        problemId: p.problemId,
        title: p.problemTitle,
        category: p.category,
        instructor: "",
        description: "",
        createdAt: new Date(),
        testCases: [],
      }) as Problem)
    );
  }, [existingQuiz, form]);

  const buildDates = (data: QuizFormValues) => {
    let startDate: Date | null = null;
    if (data.startDate && data.startTime) {
      startDate = new Date(data.startDate);
      const [h, m] = data.startTime.split(":");
      startDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }
    let endDate: Date | null = null;
    if (data.endDate && data.endTime) {
      endDate = new Date(data.endDate);
      const [h, m] = data.endTime.split(":");
      endDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }
    return { startDate, endDate };
  };

  const createMutation = useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      toast.success("Quiz created successfully!");
      navigate(`/instructor/classrooms/${classroomId}/view`);
    },
    onError: (error) => toast.error("Failed to create quiz", { description: error.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuizUpdateData }) => updateQuiz(id, data),
    onSuccess: () => {
      toast.success("Quiz updated successfully!");
      navigate(`/instructor/classrooms/${classroomId}/quizes/${quizId}/view`);
    },
    onError: (error) => toast.error("Failed to update quiz", { description: error.message }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: QuizFormValues) => {
    if (!classroomId) return;
    const { startDate, endDate } = buildDates(data);
    const problems = data.problems.map((p, i) => ({
      problemId: p.problemId,
      points: p.points,
      problemOrder: i + 1,
    }));

    if (isEditMode) {
      const payload: QuizUpdateData = {
        title: data.title,
        description: data.description,
        time_limit_minutes: data.time_limit_minutes,
        startDate,
        endDate,
        shuffleProblems: data.shuffleProblems,
        problems,
      };
      updateMutation.mutate({ id: Number(quizId), data: payload });
    } else {
      const payload: QuizCreationData = {
        classroomId: Number(classroomId),
        title: data.title,
        description: data.description,
        time_limit_minutes: data.time_limit_minutes,
        startDate,
        endDate,
        shuffleProblems: data.shuffleProblems,
        problems,
      };
      createMutation.mutate(payload);
    }
  };

  const onError = (_errors: any) => {
    toast.error("Please fill in all required fields", {
      description: "Review the form for any highlighted errors.",
      icon: <AlertCircle className="h-5 w-5 text-destructive" />,
      duration: 5000,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          onClick={() =>
            isEditMode
              ? navigate(`/instructor/classrooms/${classroomId}/quizes/${quizId}/view`)
              : navigate(`/instructor/classrooms/${classroomId}/view`)
          }
        >
          <ArrowLeft size={15} />
          {isEditMode ? "Back to Quiz" : "Back to Classroom"}
        </button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Edit Quiz" : "Create New Quiz"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isEditMode
            ? "Update the quiz details, problems, and settings."
            : "Assemble a quiz from your existing problems to assess student knowledge."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Details & Settings</TabsTrigger>
              <TabsTrigger value="problems">Problems</TabsTrigger>
              <TabsTrigger value="preview">Preview & {isEditMode ? "Save" : "Create"}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-8">
              <QuizDetailsSection form={form} />
              <QuizSettingsSection form={form} />
              <div className="flex justify-end">
                <Button type="button" onClick={() => setActiveTab("problems")}>
                  Continue to Problems
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="problems">
              <QuizProblemsSection
                form={form}
                selectedProblems={selectedProblems}
                setSelectedProblems={setSelectedProblems}
              />
              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={() => setActiveTab("details")}>
                  Back to Details
                </Button>
                <Button type="button" onClick={() => setActiveTab("preview")}>
                  Continue to Preview
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview">
              <QuizPreviewSection form={form} selectedProblems={selectedProblems} />
              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={() => setActiveTab("problems")}>
                  Back to Problems
                </Button>
                <Button type="submit" className="gap-2" disabled={isPending}>
                  <Save size={16} />
                  {isPending
                    ? isEditMode ? "Saving..." : "Creating..."
                    : isEditMode ? "Save Changes" : "Confirm & Create Quiz"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
};

export default QuizCreationPage;
