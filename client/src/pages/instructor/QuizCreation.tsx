import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuizDetailsSection from "@/components/instructor/quiz/creation/QuizDetailsSection";
import QuizProblemsSection from "@/components/instructor/quiz/creation/QuizProblemsSection";
import QuizSettingsSection from "@/components/instructor/quiz/creation/QuizSettingsSection";
import QuizPreviewSection from "@/components/instructor/quiz/creation/QuizPreviewSection";

import { createQuiz } from "@/services/QuizService";
import { Problem } from "@/types/Problem";
import { QuizCreationData, quizFormSchema, QuizFormValues } from "@/types/Quiz";


const CreateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { classroomId } = useParams<{ classroomId: string }>();
  const [activeTab, setActiveTab] = useState("details");
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([]);

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      title: "",
      description: "",
      time_limit_minutes: 60,
      shuffle_problems: false,
      problems: [],
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: createQuiz,
    onSuccess: (data) => {
      toast.success("Quiz created successfully!");
      navigate(`/instructor/classrooms/${classroomId}/view`);
    },
    onError: (error) => {
      toast.error("Failed to create quiz", {
        description: error.message,
      });
    },
  });

  const onSubmit = (data: QuizFormValues) => {
    if (!classroomId) return;

    let startDate = null;
    if (data.start_date && data.start_time) {
      startDate = new Date(data.start_date);
      const [hours, minutes] = data.start_time.split(":");
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    let endDate = null;
    if (data.end_date && data.end_time) {
      endDate = new Date(data.end_date);
      const [hours, minutes] = data.end_time.split(":");
      endDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    const payload: QuizCreationData = {
      classroomId: Number(classroomId),
      title: data.title,
      description: data.description,
      time_limit_minutes: data.time_limit_minutes,
      start_date: startDate,
      end_date: endDate,
      shuffle_problems: data.shuffle_problems,
      problems: data.problems.map((p, index) => ({
        problem_id: p.problemId,
        points: p.points,
        problem_order: index + 1,
      })),
    };
    
    createQuizMutation.mutate(/*payload*/);
  };

  const onError = (errors: any) => {
    console.error("Form Errors:", errors);
    toast.error("Please fill in all required fields", {
      description: "Review the form for any highlighted errors.",
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      duration: 5000,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
            <Button
              variant="outline"
              className="flex items-center gap-2 mb-4"
              onClick={() => navigate(`/instructor/classrooms/${classroomId}/view`)}
            >
              <ArrowLeft size={16} />
              Back to Classroom
            </Button>
            <h1 className="text-3xl font-bold">Create New Quiz</h1>
            <p className="text-gray-400 mt-2">
              Assemble a quiz from your existing problems to assess student knowledge.
            </p>
        </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="details">Details & Settings</TabsTrigger>
                        <TabsTrigger value="problems">Problems</TabsTrigger>
                        <TabsTrigger value="preview">Preview & Create</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-8">
                        <QuizDetailsSection form={form} />
                        <QuizSettingsSection form={form} />
                        <div className="flex justify-end">
                            <Button type="button" onClick={() => setActiveTab('problems')}>Continue to Problems</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="problems">
                        <QuizProblemsSection
                            form={form}
                            selectedProblems={selectedProblems}
                            setSelectedProblems={setSelectedProblems}
                        />
                         <div className="flex justify-between mt-6">
                            <Button type="button" variant="outline" onClick={() => setActiveTab('details')}>Back to Details</Button>
                            <Button type="button" onClick={() => setActiveTab('preview')}>Continue to Preview</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="preview">
                        <QuizPreviewSection form={form} selectedProblems={selectedProblems} />
                        <div className="flex justify-between mt-6">
                            <Button type="button" variant="outline" onClick={() => setActiveTab('problems')}>Back to Problems</Button>
                             <Button
                                type="submit"
                                className="gap-2"
                                disabled={form.formState.isSubmitting || createQuizMutation.isPending}
                                >
                                <Save size={16} />
                                {createQuizMutation.isPending ? "Creating..." : "Confirm & Create Quiz"}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </form>
        </Form>
    </div>
  );
};

export default CreateQuizPage;