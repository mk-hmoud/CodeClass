import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import BasicInfoSection, { TestCaseOverrideDraft } from "@/components/instructor/assignment/creation/BasicInfoSection";
import ProblemSetBuilder, { ProblemSetItem } from "@/components/instructor/assignment/creation/ProblemSetBuilder";
import SubmissionSettingsSection from "@/components/instructor/assignment/creation/SubmissionSettingsSection";
import ScheduleSection from "@/components/instructor/assignment/creation/ScheduleSection";
import ConfirmationDialog from "@/components/instructor/assignment/creation/ConfirmationDialog";
import { FormValues, formSchema } from "@/lib/assignmentUtils";
import { createAssignment } from "@/services/AssignmentService";
import { getLanguages } from "@/services/LanguageService";
import { AssignmentCreationData } from "@/types/Assignment";
import { useQuery } from "@tanstack/react-query";

const CreateAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { classroomId } = useParams<{ classroomId: string }>();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  const [problemSet, setProblemSet] = useState<ProblemSetItem[]>([]);
  const [testCaseOverrides, setTestCaseOverrides] = useState<TestCaseOverrideDraft[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemId: "",
      libraryId: "",
      groupId: "",
      title: "",
      description: "",
      difficulty_level: "Medium",
      points: 0,
      grading_method: "Automatic",
      grade_release_mode: "immediate",
      enable_max_submissions: false,
      max_submissions: 3,
      plagiarism_detection: true,
      publish_immediately: false,
      publish_date: new Date(),
      publish_time: "12:00",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      due_time: "23:59",
      programming_languages: [],
    },
  });

  const watchEnableSubmissionAttempts = form.watch("enable_max_submissions");
  const watchPublishImmediately = form.watch("publish_immediately");

  const { data: languages } = useQuery({
    queryKey: ["programmingLanguages"],
    queryFn: getLanguages,
    staleTime: 5 * 60 * 1000,
  });

  const primaryProblem = problemSet[0]?.problem ?? null;
  const singleProblem = problemSet.length === 1;
  const totalPoints = problemSet.reduce((s, it) => s + (Number(it.points) || 0), 0);

  // Validation lives here (not in zod) because the problem set is outside the
  // form. Surfaces a specific toast rather than a silent no-op.
  const validateProblemSet = (data: FormValues): boolean => {
    if (problemSet.length === 0) {
      toast.error("Add at least one problem to this assignment.");
      return false;
    }
    if (problemSet.length > 1 && !data.title?.trim()) {
      toast.error("Give the assignment a title (it has multiple problems, so there's no single problem to borrow it from).");
      return false;
    }
    const missing = problemSet.find(
      (it) => it.problem.runtime !== "systems" && it.languages.length === 0
    );
    if (missing) {
      toast.error(`Pick at least one language for "${missing.problem.title}".`);
      return false;
    }
    return true;
  };

  const onSubmit = (data: FormValues) => {
    if (!validateProblemSet(data)) return;
    form.setValue("points", totalPoints);
    setFormData({ ...data, points: totalPoints });
    setShowConfirmDialog(true);
  };

  const onError = () => {
    toast.error("Please fill in all required fields", {
      description: "Some required information is missing. Check the highlighted fields.",
      icon: <AlertCircle className="h-5 w-5 text-destructive" />,
      duration: 5000,
    });
  };

  const handleConfirmCreate = async () => {
    if (!formData || problemSet.length === 0) return;

    let publishDate: Date | null = null;
    if (formData.publish_immediately) {
      publishDate = new Date();
    } else if (formData.publish_date && formData.publish_time) {
      publishDate = new Date(formData.publish_date);
      const [h, m] = formData.publish_time.split(":");
      publishDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }

    let dueDate: Date | null = null;
    if (formData.due_date && formData.due_time) {
      dueDate = new Date(formData.due_date);
      const [h, m] = formData.due_time.split(":");
      dueDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }

    const langId = (name: string) => languages?.find((l) => l.name === name)?.language_id || 0;
    const problems = problemSet.map((it, i) => ({
      problemId: it.problem.problemId,
      points: Number(it.points) || 0,
      position: i,
      languages: it.problem.runtime === "systems"
        ? []
        : it.languages.map((name) => ({ languageId: langId(name), initial_code: it.codeByLanguage[name] || "" })),
      libraryId: it.problem.runtime === "systems" ? null : (it.libraryId ?? null),
    }));

    const payload: AssignmentCreationData = {
      classroomId: Number(classroomId),
      problemId: problems[0].problemId,
      problems,
      title: formData.title || primaryProblem?.title || "",
      description: formData.description || (singleProblem ? primaryProblem?.description : "") || "",
      difficulty_level: formData.difficulty_level,
      points: totalPoints,
      grading_method: formData.grading_method,
      grade_release_mode: formData.grading_method === "Manual" ? "immediate" : formData.grade_release_mode,
      max_submissions: formData.enable_max_submissions ? formData.max_submissions : undefined,
      plagiarism_detection: formData.plagiarism_detection,
      publish_date: publishDate ?? undefined,
      due_date: dueDate ?? undefined,
      libraryId: formData.libraryId ? Number(formData.libraryId) : undefined,
      groupId: formData.groupId ? Number(formData.groupId) : undefined,
      testCaseOverrides: formData.groupId && singleProblem && testCaseOverrides.length > 0 ? testCaseOverrides : undefined,
      languages: problems[0].languages,
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
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
            onClick={() => navigate(`/instructor/classrooms/${classroomId}/view`)}
          >
            <ArrowLeft size={15} />
            Back to Classroom
          </button>
          <h1 className="text-2xl font-bold">Create New Assignment</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add one or more problems, then set how the assignment is graded and scheduled.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex-1 flex flex-col">
          <div className="max-w-5xl mx-auto w-full px-6 py-6 space-y-6">
            <ProblemSetBuilder value={problemSet} onChange={setProblemSet} languages={languages} />

            <BasicInfoSection
              form={form}
              classroomId={Number(classroomId)}
              primaryProblem={primaryProblem}
              singleProblem={singleProblem}
              onTestCaseOverridesChange={setTestCaseOverrides}
            />

            <SubmissionSettingsSection
              form={form}
              watchEnableSubmissionAttempts={watchEnableSubmissionAttempts}
            />

            <ScheduleSection
              form={form}
              watchPublishImmediately={watchPublishImmediately}
            />
          </div>

          <div className="max-w-5xl mx-auto w-full px-6 py-6 flex justify-end">
            <Button type="submit" className="gap-2" disabled={form.formState.isSubmitting}>
              <Save size={16} />
              Create Assignment
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        formData={formData}
        problemTitle={primaryProblem?.title}
        problems={problemSet.map((it) => ({ title: it.problem.title, points: Number(it.points) || 0 }))}
        onConfirm={handleConfirmCreate}
      />
    </div>
  );
};

export default CreateAssignmentPage;
