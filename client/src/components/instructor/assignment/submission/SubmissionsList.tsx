import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullSubmission } from "@/types/Submission";

interface SubmissionsListProps {
  assignmentScore: number;
  gradingType: "Automatic" | "Manual" | "Hybrid";
  submissions: FullSubmission[];
  onViewSubmission: (submissionId: number) => void;
  onGradeSubmission: (submissionId: number) => void;
}

const SubmissionsList: React.FC<SubmissionsListProps> = ({
  assignmentScore,
  gradingType,
  submissions,
  onViewSubmission,
  onGradeSubmission,
}) => {
  const [activeTab, setActiveTab] = useState<string>("all");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "graded":
        return <Badge className="bg-green-600">Graded</Badge>;
      case "system graded":
        return <Badge className="bg-blue-600">System Graded</Badge>;
      case "pending":
        return <Badge className="bg-amber-500">Pending</Badge>;
      default:
        return <Badge className="bg-gray-600">{status}</Badge>;
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending")
      return (
        submission.gradingStatus === "pending" ||
        submission.gradingStatus === "system graded"
      );
    if (activeTab === "graded") return submission.gradingStatus === "graded";
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " at " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  // Function to determine the appropriate score to display
  const getDisplayScore = (submission: FullSubmission) => {
    if (submission.finalScore !== null && submission.finalScore !== undefined) {
      return submission.finalScore;
    }
    if (
      submission.manualScore !== null &&
      submission.manualScore !== undefined
    ) {
      return submission.manualScore;
    }
    if (submission.autoScore !== null && submission.autoScore !== undefined) {
      return submission.autoScore;
    }
    return null;
  };

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-[#0c121f] p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#123651]">
            All Submissions
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-[#123651]"
          >
            Pending
          </TabsTrigger>
          <TabsTrigger
            value="graded"
            className="data-[state=active]:bg-[#123651]"
          >
            Graded
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {filteredSubmissions.length} submission
              {filteredSubmissions.length !== 1 ? "s" : ""}
            </div>
          </div>

          {filteredSubmissions.length > 0 ? (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <Card
                  key={submission.submissionId}
                  className="bg-card border-border"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-muted">
                          <User className="h-5 w-5" />
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {submission.studentName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Student ID: {submission.studentId}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-sm text-muted-foreground">
                          Submitted
                        </div>
                        <div className="text-sm">
                          {formatDate(submission.submittedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(submission.gradingStatus)}
                        {getDisplayScore(submission) !== null && (
                          <span className="font-bold">
                            {getDisplayScore(submission)}/{assignmentScore}
                          </span>
                        )}
                      </div>
                      <div>
                        {submission.gradingStatus === "pending" ? (
                          <Button
                            onClick={() =>
                              onGradeSubmission(submission.submissionId)
                            }
                          >
                            Grade Submission
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() =>
                              onViewSubmission(submission.submissionId)
                            }
                          >
                            View Submission
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Plagiarism alert if any high similarity reports exist */}
                    {submission.plagiarismReports &&
                      submission.plagiarismReports.some(
                        (report) => report.similarity > 70
                      ) && (
                        <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded-md text-sm">
                          <span className="text-red-400 font-medium">
                            ⚠️ Potential plagiarism detected
                          </span>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No submissions in this category.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubmissionsList;
