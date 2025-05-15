import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Check,
  X,
  Clock,
  Code,
  FileText,
  FileX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Avatar } from "@/components/ui/avatar";
import { TestResult } from "@/types/TestCase";
import { FullSubmission } from "@/types/Submission";
import { updateManualGrade } from "@/services/GradesService";

interface SubmissionDetailsViewProps {
  assignmentScore: number;
  submission: FullSubmission;
  gradingType: "Automatic" | "Manual" | "Hybrid";
  onBack: () => void;
  onSubmitGrade: (id: number, score: number, feedback: string) => void;
}

const SubmissionDetailsView: React.FC<SubmissionDetailsViewProps> = ({
  assignmentScore,
  submission,
  gradingType,
  onBack,
  onSubmitGrade,
}) => {
  const [activeTab, setActiveTab] = useState<string>("code");
  const [calculatedFinalScore, setCalculatedFinalScore] = useState(
    submission.finalScore ||
      Math.round(
        (submission.autoScore || 0 + (submission.manualScore || 0)) / 2
      )
  );
  const form = useForm({
    defaultValues: {
      manualScore: submission.manualScore || 0,
      feedback: submission.feedback || "",
    },
  });

  useEffect(() => {
    if (gradingType === "Hybrid") {
      const manualScore = form.watch("manualScore") || 0;
      const systemScore = submission.autoScore || 0;
      const finalScore = Math.round((systemScore + manualScore) / 2);
      setCalculatedFinalScore(finalScore);
    }
  }, [form.watch("manualScore"), submission.autoScore, gradingType]);

  const handleSubmitGrade = async (values: {
    manualScore: number;
    feedback: string;
  }) => {
    try {
      const result = await updateManualGrade({
        submissionId: submission.submissionId,
        manualScore: values.manualScore,
        feedback: values.feedback,
      });
      onSubmitGrade(result.submissionId, result.finalScore, values.feedback);
      toast({ title: "Success", description: "Grade updated successfully" });
    } catch (err: any) {
      console.error("Grade submit error:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Could not save grade",
        variant: "destructive",
      });
    }
  };

  const renderTestCaseResult = (result: TestResult, index: number) => {
    return (
      <Card
        key={index}
        className="mb-4 bg-[#13182a] border-border overflow-hidden"
      >
        <CardContent className="p-0">
          <div className="border-b border-border p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  result.status === "passed" ? "secondary" : "destructive"
                }
                className={`capitalize ${
                  result.status === "passed"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }`}
              >
                {result.status === "passed" ? "Passed" : "Failed"}
              </Badge>
              <span className="font-medium">Test Case #{index + 1}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={14} className="text-muted-foreground" />
              <span>{result.executionTime}ms</span>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-border">
            <div className="p-3">
              <div className="text-sm font-medium mb-1 text-muted-foreground">
                Input
              </div>
              <pre className="bg-[#0d1224] p-2 rounded text-sm overflow-x-auto">
                {result.input || "[]"}
              </pre>
            </div>

            <div className="p-3">
              <div className="text-sm font-medium mb-1 text-muted-foreground">
                Output
              </div>
              <pre className="bg-[#0d1224] p-2 rounded text-sm overflow-x-auto">
                {result.actual || "None"}
              </pre>
            </div>

            <div className="p-3">
              <div className="text-sm font-medium mb-1 text-muted-foreground">
                Expected
              </div>
              <pre className="bg-[#0d1224] p-2 rounded text-sm overflow-x-auto">
                {result.expectedOutput || "0"}
              </pre>
            </div>

            {result.status !== "passed" && result.errorMessage && (
              <div className="p-3">
                <div className="text-red-500 flex items-center gap-1.5">
                  <X size={14} />
                  <span className="font-medium">Error</span>
                </div>
                <pre className="bg-[#0d1224] p-2 rounded text-sm overflow-x-auto mt-1 text-red-400">
                  {result.errorMessage}
                </pre>
              </div>
            )}

            {result.status === "passed" && (
              <div className="p-3">
                <div className="text-green-500 flex items-center gap-1.5">
                  <Check size={14} />
                  <span className="font-medium">Right Answer</span>

                  <span className="text-muted-foreground ml-1">
                    | Runtime: {result.executionTime}ms
                  </span>
                </div>
              </div>
            )}

            {result.status !== "passed" && (
              <div className="p-3">
                <div className="text-red-500 flex items-center gap-1.5">
                  <X size={14} />
                  <span className="font-medium">Wrong Answer</span>
                  <span className="text-muted-foreground ml-1">
                    | Runtime: {result.executionTime}ms
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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

  const renderGradingSection = () => {
    // For Automatic Grading
    if (gradingType === "Automatic") {
      return (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Grading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-2">System Score</h3>
              <div className="text-4xl font-bold mb-1">
                {submission.autoScore || 0}/{assignmentScore}
              </div>
              <p className="text-sm text-muted-foreground">
                Based on automated test results
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm mb-4">
                This assignment is automatically graded. The system score is
                final.
              </p>
              <Button
                variant="outline"
                onClick={() => setActiveTab("test-results")}
              >
                View Test Results
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (gradingType === "Manual") {
      if (submission.gradingStatus === "graded") {
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Grading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Instructor Score</h3>
                <div className="text-4xl font-bold mb-1">
                  {submission.manualScore || 0}/{assignmentScore}
                </div>
                <p className="text-sm text-muted-foreground">
                  Manually graded by instructor
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium mb-2">Feedback</h3>
                {submission.feedback ? (
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {submission.feedback}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No feedback provided.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      }

      return (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Grading</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmitGrade)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="manualScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Instructor Score (0-{assignmentScore})
                      </FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          min={0}
                          max={assignmentScore}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feedback"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feedback</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide detailed feedback for the student..."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Submit Final Grade
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      );
    }

    if (gradingType === "Hybrid") {
      if (submission.gradingStatus === "graded") {
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Grading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 mb-6 bg-purple-900/20 border border-purple-500/30 rounded-md">
                <h3 className="text-lg font-semibold text-purple-400 mb-1">
                  Hybrid Grading
                </h3>
                <p className="text-sm text-gray-300">
                  This submission has been graded using both automated tests and
                  instructor review.
                </p>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">System Score</h3>
                <div className="text-4xl font-bold mb-1">
                  {submission.autoScore || 0}/100
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on automated test results
                </p>
              </div>

              <div className="mb-4 pt-4 border-t border-border">
                <h3 className="text-xl font-bold mb-2">Instructor Score</h3>
                <div className="text-4xl font-bold mb-1">
                  {submission.manualScore || 0}/100
                </div>
                <p className="text-sm text-muted-foreground">
                  Manually graded by instructor
                </p>
              </div>

              <div className="mb-4 pt-4 border-t border-border">
                <h3 className="text-xl font-bold mb-2">Final Score</h3>
                <div className="text-4xl font-bold text-purple-400 mb-1">
                  {submission.finalScore || 0}/{assignmentScore}
                </div>
                <p className="text-sm text-muted-foreground">
                  Combined score (system + instructor)
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium mb-2">Feedback</h3>
                {submission.feedback ? (
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {submission.feedback}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No feedback provided.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      }

      return (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Grading</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 mb-6 bg-purple-900/20 border border-purple-500/30 rounded-md">
              <h3 className="text-lg font-semibold text-purple-400 mb-1">
                Hybrid Grading
              </h3>
              <p className="text-sm text-gray-300">
                This submission has been automatically graded, but requires
                instructor review and final grade determination.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">System Score</h3>
              <div className="text-4xl font-bold mb-1">
                {submission.autoScore || 0}/100
              </div>
              <p className="text-sm text-muted-foreground">
                Based on automated test results
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmitGrade)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="manualScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Instructor Score (0-{assignmentScore})
                      </FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          min={0}
                          max={assignmentScore}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="text-sm mt-2 py-2 px-3 bg-purple-900/30 border border-purple-500/20 rounded flex justify-between items-center">
                  <span>Final score would be:</span>

                  <span className="font-bold text-purple-300">
                    {calculatedFinalScore}/{assignmentScore}
                  </span>
                </div>

                <FormField
                  control={form.control}
                  name="feedback"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feedback</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide detailed feedback for the student..."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="text-sm text-muted-foreground mb-4">
                  The final grade will be calculated as an average of system and
                  instructor scores.
                </div>

                <Button type="submit" className="w-full">
                  Submit Final Grade
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <Button
        variant="outline"
        className="mb-6 flex items-center gap-2"
        onClick={onBack}
      >
        <ArrowLeft size={16} />
        Return to Submissions List
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
                {submission.gradingStatus !== "graded" && (
                  <div className="flex justify-between items-center pt-3">
                    <span className="text-lg font-semibold">Final Score</span>
                    <span className="text-xl font-bold">--/--</span>
                  </div>
                )}

                {submission.gradingStatus === "graded" &&
                  submission.finalScore !== null && (
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-lg font-semibold">Final Score</span>
                      <span className="text-xl font-bold">
                        {submission.finalScore}/{assignmentScore}
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
                <div className="flex items-center gap-2">
                  <Code size={14} />
                  <span>Code Submission</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="test-results"
                className="data-[state=active]:bg-[#123651]"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span>Test Results</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="plagiarism"
                className="data-[state=active]:bg-[#123651]"
              >
                <div className="flex items-center gap-2">
                  <FileX size={14} />
                  <span>Plagiarism Check</span>
                </div>
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
                  {submission.verdict.testResults ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-3">
                          Test Results
                        </h3>
                        <div className="space-y-3">
                          {submission.verdict.testResults.map((result, idx) =>
                            renderTestCaseResult(result, idx)
                          )}
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
                                Passed {submission.verdict.metrics.passedTests}{" "}
                                of {submission.verdict.metrics.totalTests} tests
                              </span>
                              <span className="font-bold">
                                {submission.verdict.metrics.totalTests > 0
                                  ? Math.round(
                                      ((submission.verdict.metrics
                                        .passedTests || 0) /
                                        submission.verdict.metrics.totalTests) *
                                        100
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                submission.verdict.metrics.totalTests > 0
                                  ? ((submission.verdict.metrics.passedTests ||
                                      0) /
                                      submission.verdict.metrics.totalTests) *
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
