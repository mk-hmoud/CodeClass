import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import BasicInfoSection from "@/components/instructor/assignment/creation/BasicInfoSection";
import SubmissionSettingsSection from "@/components/instructor/assignment/creation/SubmissionSettingsSection";
import ScheduleSection from "@/components/instructor/assignment/creation/ScheduleSection";
import ProgrammingLanguagesSection from "@/components/instructor/assignment/creation/ProgrammingLanguagesSection";
import ConfirmationDialog from "@/components/instructor/assignment/creation/ConfirmationDialog";
import { FormValues, formSchema } from "@/lib/assignmentUtils";
import { createAssignment } from "@/services/AssignmentService";
import { Problem } from "@/types/Problem";
import { AssignmentCreationData } from "../../types/Assignment";

const CreateAssignmentPage = () => {
  const navigate = useNavigate();
  const { classroomId } = useParams<{ classroomId: string }>();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  // Local state to capture the languages selections from the ProgrammingLanguagesSection.
  const [languagesData, setLanguagesData] = useState<{
    selectedLanguages: string[];
    codeByLanguage: Record<string, string>;
  }>({ selectedLanguages: [], codeByLanguage: {} });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemId: "",
      title: "",
      description: "",
      difficulty_level: "Medium",
      points: 10,
      grading_method: "Automatic",
      enable_submission_attempts: false,
      submission_attempts: 3,
      plagiarism_detection: true,
      publish_immediately: false,
      publish_date: new Date(),
      publish_time: "12:00",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      due_time: "23:59",
      programming_languages: [], // We let ProgrammingLanguagesSection control this now.
    },
  });

  const watchEnableSubmissionAttempts = form.watch(
    "enable_submission_attempts"
  );
  const watchPublishImmediately = form.watch("publish_immediately");

  const onSubmit = (data: FormValues) => {
    setFormData(data);
    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = async () => {
    if (formData) {
      const assignmentPayload: AssignmentCreationData = {
        classroomId: Number(classroomId),
        problemId: selectedProblem
          ? selectedProblem.problemId
          : Number(formData.problemId),
        title: formData.title || (selectedProblem ? selectedProblem.title : ""),
        description:
          formData.description ||
          (selectedProblem ? selectedProblem.description : ""),
        difficulty_level: formData.difficulty_level,
        points: formData.points,
        grading_method: formData.grading_method,
        submission_attempts: formData.enable_submission_attempts
          ? formData.submission_attempts
          : undefined,
        plagiarism_detection: formData.plagiarism_detection,
        publish_date: formData.publish_date,
        due_date: formData.due_date,
        languages: Object.keys(languagesData.codeByLanguage).map((lang) => ({
          languageId: 0, // Replace with the actual mapping if available.
          initial_code: languagesData.codeByLanguage[lang],
        })),
      };

      try {
        console.log("Converted assignment payload:", assignmentPayload);
        const createdAssignment = await createAssignment(assignmentPayload);
        toast.success("Assignment created successfully");
        console.log("Created assignment:", createdAssignment);
        setShowConfirmDialog(false);
        navigate(`/instructor/classrooms/view/${classroomId}`);
      } catch (error) {
        console.error("Error creating assignment:", error);
        toast.error("Error creating assignment");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button
          variant="outline"
          className="flex items-center gap-2 mb-4"
          onClick={() => navigate(`/instructor/classrooms/view/${classroomId}`)}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Create New Assignment</h1>
        <p className="text-gray-400 mt-2">
          Create a new assignment for your students based on an existing
          problem.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <BasicInfoSection
            form={form}
            onSelectedProblemChange={(problem) => setSelectedProblem(problem)}
          />
          <SubmissionSettingsSection
            form={form}
            watchEnableSubmissionAttempts={watchEnableSubmissionAttempts}
          />
          <ScheduleSection
            form={form}
            watchPublishImmediately={watchPublishImmediately}
          />
          <ProgrammingLanguagesSection
            onLanguagesChange={(selected, code) =>
              setLanguagesData({
                selectedLanguages: selected,
                codeByLanguage: code,
              })
            }
          />
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(`/instructor/classrooms/view/${classroomId}`)
              }
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
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
        onConfirm={handleConfirmCreate}
      />
    </div>
  );
};

export default CreateAssignmentPage;
