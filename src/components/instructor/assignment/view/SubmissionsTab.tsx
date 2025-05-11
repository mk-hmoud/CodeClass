import React, { useState } from "react";
import { FullSubmission } from "@/types/Submission";
import SubmissionsList from "../submission/SubmissionsList";
import SubmissionDetailsView from "../submission/SubmissionDetailsView";
import { toast } from "sonner";

interface SubmissionsTabProps {
  submissions: FullSubmission[];
  formatDate: (dateString: string | null) => string;
  assignmentTitle?: string;
  assignmentDescription?: string;
  gradingType: "Automatic" | "Manual" | "Hybrid";
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({
  submissions,
  formatDate,
  assignmentTitle = "Assignment",
  assignmentDescription,
  gradingType = "Automatic",
}) => {
  const [viewMode, setViewMode] = useState<"list" | "details">("list");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    number | null
  >(null);

  // Find the selected submission
  const selectedSubmission = submissions.find(
    (sub) => sub.submissionId === selectedSubmissionId
  );

  const handleViewSubmission = (submissionId: number) => {
    setSelectedSubmissionId(submissionId);
    setViewMode("details");
  };

  const handleGradeSubmission = (submissionId: number) => {
    setSelectedSubmissionId(submissionId);
    setViewMode("details");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedSubmissionId(null);
  };

  const handleSubmitGrade = (id: number, score: number, feedback: string) => {
    // In a real app, this would send the grade to an API
    console.log("Submitting grade:", {
      submissionId: id,
      score,
      feedback,
    });

    // Update local submission data (in a real app, this would be done after API confirms the update)
    const updatedSubmissions = submissions.map((sub) => {
      if (sub.submissionId === id) {
        return {
          ...sub,
          manualScore: score,
          finalScore: score,
          feedback: feedback,
          gradingStatus: "graded" as const,
        };
      }
      return sub;
    });

    // Show success message
    toast.success("Grade submitted successfully");

    // Navigate back to the list view after a short delay
    setTimeout(() => {
      handleBackToList();
    }, 1500);
  };

  if (viewMode === "details" && selectedSubmission) {
    return (
      <SubmissionDetailsView
        submission={selectedSubmission}
        gradingType={gradingType}
        onBack={handleBackToList}
        onSubmitGrade={handleSubmitGrade}
      />
    );
  }

  return (
    <SubmissionsList
      gradingType={gradingType}
      submissions={submissions}
      onViewSubmission={handleViewSubmission}
      onGradeSubmission={handleGradeSubmission}
    />
  );
};

export default SubmissionsTab;
