import React, { useState } from "react";
import { FullSubmission, GradedSubmission } from "@/types/Submission";
import SubmissionsList from "../submission/SubmissionsList";
import SubmissionDetailsView from "../submission/SubmissionDetailsView";

interface SubmissionsTabProps {
  submissions: FullSubmission[];
  /** Hands a confirmed grade up so the owner of `submissions` can patch it. */
  onGraded: (update: GradedSubmission) => void;
  formatDate: (dateString: string | null) => string;
  assignmentTitle?: string;
  assignmentDescription?: string;
  assignmentScore: number;
  gradingType: "Automatic" | "Manual" | "Hybrid";
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({
  submissions,
  formatDate,
  assignmentTitle = "Assignment",
  assignmentDescription,
  assignmentScore,
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

  const handleSubmitGrade = (update: GradedSubmission) => {
    onGraded(update);
    // Brief pause so the toast SubmissionDetailsView raised is readable before
    // the view changes under it.
    setTimeout(handleBackToList, 1500);
  };

  if (viewMode === "details" && selectedSubmission) {
    return (
      <SubmissionDetailsView
        assignmentScore={assignmentScore}
        submission={selectedSubmission}
        gradingType={gradingType}
        onBack={handleBackToList}
        onSubmitGrade={handleSubmitGrade}
      />
    );
  }

  return (
    <SubmissionsList
      assignmentScore={assignmentScore}
      gradingType={gradingType}
      submissions={submissions}
      onViewSubmission={handleViewSubmission}
      onGradeSubmission={handleGradeSubmission}
    />
  );
};

export default SubmissionsTab;
