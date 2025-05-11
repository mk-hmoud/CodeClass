import React, { useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { FullSubmission } from "@/types/Submission";
import { AutomaticGrading } from "./grading/AutomaticGrading";
import { ManualGrading } from "./grading/ManualGrading";
import { HybridGrading } from "./grading/HybridGrading";

interface SubmissionDetailsViewProps {
  submission: FullSubmission;
  gradingType: "Automatic" | "Manual" | "Hybrid";
  onBack: () => void;
  onSubmitGrade: (id: number, score: number, feedback: string) => void;
}

const SubmissionDetailsView: React.FC<SubmissionDetailsViewProps> = ({
  submission,
  gradingType,
  onBack,
  onSubmitGrade,
}) => {
  const [activeTab, setActiveTab] = useState<string>("code");

  const handleSubmitGrade = (id: number, score: number, feedback: string) => {
    onSubmitGrade(id, score, feedback);
    toast.success("Grade submitted successfully");
  };

  const renderGradingSection = () => {
    switch (gradingType) {
      case "Automatic":
        return (
          <AutomaticGrading
            submission={submission}
            onViewTestResults={() => setActiveTab("test-results")}
          />
        );

      case "Manual":
        return (
          <ManualGrading
            submission={submission}
            onSubmitGrade={handleSubmitGrade}
          />
        );

      case "Hybrid":
        return (
          <HybridGrading
            submission={submission}
            onSubmitGrade={handleSubmitGrade}
          />
        );
    }
  };

  // Get the status badge color based on gradingStatus
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "graded":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "system graded":
        return <Badge className="bg-blue-600">System Graded</Badge>;
      case "pending":
        return <Badge className="bg-amber-600">Pending</Badge>;
      default:
        return <Badge className="bg-gray-600">Unknown</Badge>;
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <Button
        variant="outline"
        className="mb-6 flex items-center gap-2"
        onClick={onBack}
      >
        <ArrowLeft size={16} />
        Back to Submissions
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Submission Details</h1>
        <div className="flex items-center gap-2">
          {gradingType === "Automatic" && (
            <Badge className="bg-blue-600">Automatic Grading</Badge>
          )}
          {gradingType === "Manual" && (
            <Badge className="bg-amber-600">Manual Grading</Badge>
          )}
          {gradingType === "Hybrid" && (
            <Badge className="bg-purple-600">Hybrid Grading</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{submission.studentName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Student ID: {submission.studentId}
                  </p>
                </div>
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 bg-muted">
                    <User className="h-6 w-6" />
                  </Avatar>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>
                    {new Date(submission.submittedAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{getStatusBadge(submission.gradingStatus)}</span>
                </div>

                {submission.finalScore !== null &&
                  submission.finalScore !== undefined && (
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-lg font-semibold">Final Score</span>
                      <span className="text-xl font-bold">
                        {submission.finalScore}/100
                      </span>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="bg-[#0c121f] p-1">
              <TabsTrigger
                value="code"
                className="data-[state=active]:bg-[#123651]"
              >
                Code Submission
              </TabsTrigger>
              <TabsTrigger
                value="test-results"
                className="data-[state=active]:bg-[#123651]"
              >
                Test Results
              </TabsTrigger>
              <TabsTrigger
                value="plagiarism"
                className="data-[state=active]:bg-[#123651]"
              >
                Plagiarism Check
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="mt-4">
              <Card className="bg-card border-border overflow-hidden">
                <CardContent className="p-0">
                  <pre className="overflow-auto text-sm bg-[#0d1224] p-4 max-h-[500px]">
                    <code className="text-gray-200">{submission.code}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="test-results" className="mt-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  {submission.results && submission.results.length > 0 ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-3">
                          Test Results
                        </h3>
                        <div className="space-y-3">
                          {submission.results.map((result, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-background rounded-md border border-border"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    Test Case {result.testCaseId}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {result.executionTimeMs}ms |{" "}
                                    {result.memoryUsageKb}KB
                                  </div>
                                </div>
                                {result.passed ? (
                                  <Badge className="bg-green-600">Passed</Badge>
                                ) : (
                                  <Badge className="bg-red-600">Failed</Badge>
                                )}
                              </div>
                              <div className="mt-2 text-sm">
                                {result.actualOutput && (
                                  <div>
                                    <span className="font-medium">Output:</span>
                                    <code className="ml-2 p-1 bg-muted rounded text-xs">
                                      {result.actualOutput}
                                    </code>
                                  </div>
                                )}
                                {result.errorMessage && (
                                  <div className="mt-1 text-red-400">
                                    <span className="font-medium">Error:</span>
                                    <code className="ml-2 p-1 bg-muted rounded text-xs">
                                      {result.errorMessage}
                                    </code>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-3">
                          Test Summary
                        </h3>
                        <Card className="bg-[#0c121f] border-border">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span>
                                Passed {submission.passedTests} of{" "}
                                {submission.totalTests} tests
                              </span>
                              <span className="font-bold">
                                {submission.totalTests
                                  ? Math.round(
                                      ((submission.passedTests || 0) /
                                        submission.totalTests) *
                                        100
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                submission.totalTests
                                  ? ((submission.passedTests || 0) /
                                      submission.totalTests) *
                                    100
                                  : 0
                              }
                              className="h-2"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No test results available for this submission.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plagiarism" className="mt-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  {submission.plagiarismReports &&
                  submission.plagiarismReports.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Plagiarism Report</h3>
                      <div className="space-y-3">
                        {submission.plagiarismReports.map((report, idx) => (
                          <Card
                            key={idx}
                            className="bg-background border-border"
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">
                                    Compared with Submission #
                                    {report.comparedSubmission}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Checked on{" "}
                                    {new Date(
                                      report.checkedAt
                                    ).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xl font-bold flex items-center">
                                    {report.similarity >= 80 ? (
                                      <Badge className="bg-red-600">
                                        {report.similarity}% match
                                      </Badge>
                                    ) : report.similarity >= 50 ? (
                                      <Badge className="bg-amber-600">
                                        {report.similarity}% match
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-green-600">
                                        {report.similarity}% match
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No plagiarism reports available for this submission.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-full md:w-80 lg:w-96">{renderGradingSection()}</div>
      </div>
    </div>
  );
};

export default SubmissionDetailsView;
