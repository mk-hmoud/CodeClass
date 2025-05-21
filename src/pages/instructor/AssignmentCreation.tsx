import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Save, Info, Check, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BasicInfoSection from "@/components/instructor/assignment/creation/BasicInfoSection";
import SubmissionSettingsSection from "@/components/instructor/assignment/creation/SubmissionSettingsSection";
import ScheduleSection from "@/components/instructor/assignment/creation/ScheduleSection";
import AssignmentCodeEditor from "@/components/editors/AssignmentCodeEditor";
import ConfirmationDialog from "@/components/instructor/assignment/creation/ConfirmationDialog";
import {
  FormValues,
  LANGUAGE_LABELS,
  formSchema,
  languageDefaultCode,
} from "@/lib/assignmentUtils";
import { createAssignment } from "@/services/AssignmentService";
import { getLanguages } from "@/services/LanguageService";
import { Problem } from "@/types/Problem";
import { AssignmentCreationData } from "@/types/Assignment";
import { useQuery } from "@tanstack/react-query";

const CreateAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { classroomId } = useParams<{ classroomId: string }>();

  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(
    {}
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemId: "",
      title: "",
      description: "",
      difficulty_level: "Medium",
      points: 10,
      grading_method: "Automatic",
      enable_max_submissions: false,
      max_submissions: 3,
      plagiarism_detection: true,
      publish_immediately: false,
      publish_date: new Date(),
      publish_time: "12:00",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      due_time: "23:59",
      programming_languages: [],
    },
  });

  const watchEnableSubmissionAttempts = form.watch("enable_max_submissions");
  const watchPublishImmediately = form.watch("publish_immediately");
  const selectedLanguages = form.watch("programming_languages") || [];

  const {
    data: languages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["programmingLanguages"],
    queryFn: getLanguages,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const toggleLanguage = (language: string) => {
    const currentLanguages = selectedLanguages;

    if (currentLanguages.includes(language)) {
      form.setValue(
        "programming_languages",
        currentLanguages.filter((lang) => lang !== language)
      );

      const newCodeMap = { ...codeByLanguage };
      delete newCodeMap[language];
      setCodeByLanguage(newCodeMap);
    } else {
      form.setValue("programming_languages", [...currentLanguages, language]);

      setCodeByLanguage({
        ...codeByLanguage,
        [language]:
          languageDefaultCode[language.toLowerCase()] ||
          `// starter code for ${language}`,
      });
    }
  };

  const handleCodeChange = (language: string, value: string | undefined) => {
    if (value !== undefined) {
      setCodeByLanguage({
        ...codeByLanguage,
        [language]: value,
      });
    }
  };

  const onSubmit = (data: FormValues) => {
    setFormData(data);
    setShowConfirmDialog(true);
  };

  const onError = (errors: any) => {
    toast.error("Please fill in all required fields", {
      description:
        "Some required information is missing. Check the highlighted fields.",

      icon: <AlertCircle className="h-5 w-5 text-red-500" />,

      duration: 5000,
    });
    /*
    const firstErrorField = Object.keys(errors)[0];

    const element = document.querySelector(`[name="${firstErrorField}"]`);

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    */
  };

  const handleConfirmCreate = async () => {
    if (!formData) return;

    let publishDate = null;
    if (formData.publish_immediately) {
      publishDate = new Date();
    } else if (formData.publish_date && formData.publish_time) {
      publishDate = new Date(formData.publish_date);
      const [hours, minutes] = formData.publish_time.split(":");
      publishDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    let dueDate = null;
    if (formData.due_date && formData.due_time) {
      dueDate = new Date(formData.due_date);
      const [hours, minutes] = formData.due_time.split(":");
      dueDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    const payload: AssignmentCreationData = {
      classroomId: Number(classroomId),
      problemId: selectedProblem
        ? selectedProblem.problemId
        : Number(formData.problemId),
      title: formData.title || selectedProblem?.title || "",
      description: formData.description || selectedProblem?.description || "",
      difficulty_level: formData.difficulty_level,
      points: formData.points,
      grading_method: formData.grading_method,
      max_submissions: formData.enable_max_submissions
        ? formData.max_submissions
        : undefined,
      plagiarism_detection: formData.plagiarism_detection,
      publish_date: publishDate,
      due_date: dueDate,
      languages: selectedLanguages.map((lang) => ({
        languageId: languages?.find((l) => l.name === lang)?.language_id || 0,
        initial_code: codeByLanguage[lang] || "",
      })),
    };

    try {
      await createAssignment(payload);
      toast.success("Assignment created successfully");
      setShowConfirmDialog(false);
      navigate(`/instructor/classrooms/${classroomId}/view`);
    } catch (err) {
      console.error(err);
      toast.error("Error creating assignment");
    }
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
        <h1 className="text-3xl font-bold">Create New Assignment</h1>
        <p className="text-gray-400 mt-2">
          Create a new assignment for your students based on an existing
          problem.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="space-y-8"
        >
          <BasicInfoSection
            form={form}
            onSelectedProblemChange={setSelectedProblem}
          />

          <SubmissionSettingsSection
            form={form}
            watchEnableSubmissionAttempts={watchEnableSubmissionAttempts}
          />

          <ScheduleSection
            form={form}
            watchPublishImmediately={watchPublishImmediately}
          />

          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="text-xl font-semibold">Programming Languages</h2>

              <FormField
                control={form.control}
                name="programming_languages"
                render={() => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>
                        Languages <span className="text-red-500">*</span>
                      </FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={16} className="text-blue-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Languages students can use for submission</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="animate-spin h-8 w-8 text-primary" />
                        <span className="ml-2">
                          Loading programming languages...
                        </span>
                      </div>
                    ) : error ? (
                      <div className="text-red-500 p-4 border border-red-300 rounded-md">
                        Error loading programming languages. Please try again
                        later.
                      </div>
                    ) : !languages || languages.length === 0 ? (
                      <div className="text-amber-500 p-4 border border-amber-300 rounded-md">
                        No programming languages are currently available.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                        {languages.map((lang) => (
                          <div
                            key={lang.language_id}
                            className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors
                              ${
                                selectedLanguages.includes(lang.name)
                                  ? "bg-primary/20 border-primary"
                                  : "border-gray-700 hover:bg-muted"
                              }
                            `}
                            onClick={() => toggleLanguage(lang.name)}
                          >
                            {selectedLanguages.includes(lang.name) && (
                              <Check size={16} className="text-primary mr-2" />
                            )}
                            <span>{LANGUAGE_LABELS[lang.name]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedLanguages.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">
                      Initial Code Templates
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info size={16} className="text-blue-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Starting code provided to students</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="space-y-4">
                    {selectedLanguages.map((language) => (
                      <div key={language} className="space-y-2">
                        <Label>{LANGUAGE_LABELS[language]}</Label>
                        <AssignmentCodeEditor
                          language={language}
                          value={codeByLanguage[language] || ""}
                          onChange={(value) =>
                            handleCodeChange(language, value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="submit"
              className="gap-2"
              disabled={form.formState.isSubmitting}
            >
              <Save size={16} />
              Create Assignment
              {form.formState.isSubmitting && (
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
              )}
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        formData={formData}
        problemTitle={selectedProblem?.title}
        onConfirm={handleConfirmCreate}
      />
    </div>
  );
};

export default CreateAssignmentPage;
