import React, { useEffect, useState } from "react";
import { ArrowLeft, Check, X, Clock, Code, FileText, FileX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
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

const GRADING_META: Record<string, { label: string; className: string }> = {
  Automatic: { label: "Automatic Grading", className: "bg-primary/15 text-primary border-primary/30 border text-[11px]" },
  Manual:    { label: "Manual Grading",    className: "bg-amber-500/15 text-amber-600 border-amber-500/30 border text-[11px]" },
  Hybrid:    { label: "Hybrid Grading",    className: "bg-violet-500/15 text-violet-600 border-violet-500/30 border text-[11px]" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  "graded":       { label: "Graded",       className: "bg-green-500/15 text-green-600 border-green-500/30 border text-[11px]" },
  "system graded":{ label: "System Graded",className: "bg-primary/15 text-primary border-primary/30 border text-[11px]" },
  "pending":      { label: "Pending",      className: "bg-amber-500/15 text-amber-600 border-amber-500/30 border text-[11px]" },
};

const SubmissionDetailsView: React.FC<SubmissionDetailsViewProps> = ({
  assignmentScore, submission, gradingType, onBack, onSubmitGrade,
}) => {
  const [activeTab, setActiveTab] = useState("code");
  const [calculatedFinalScore, setCalculatedFinalScore] = useState(
    submission.finalScore ?? Math.round(((submission.autoScore ?? 0) + (submission.manualScore ?? 0)) / 2)
  );

  const form = useForm({
    defaultValues: { manualScore: submission.manualScore ?? 0, feedback: submission.feedback ?? "" },
  });

  useEffect(() => {
    if (gradingType === "Hybrid") {
      const manualScore = form.watch("manualScore") ?? 0;
      setCalculatedFinalScore(Math.round(((submission.autoScore ?? 0) + manualScore) / 2));
    }
  }, [form.watch("manualScore"), submission.autoScore, gradingType]);

  const handleSubmitGrade = async (values: { manualScore: number; feedback: string }) => {
    try {
      const result = await updateManualGrade({ submissionId: submission.submissionId, manualScore: values.manualScore, feedback: values.feedback });
      onSubmitGrade(result.submissionId, result.finalScore, values.feedback);
      toast({ title: "Success", description: "Grade updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message ?? "Could not save grade", variant: "destructive" });
    }
  };

  const renderTestCase = (result: TestResult, index: number) => (
    <div key={index} className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          {result.status === "passed" ? (
            <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
              <Check size={11} className="text-green-600" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center">
              <X size={11} className="text-destructive" />
            </div>
          )}
          <span className="text-xs font-medium">Test Case #{index + 1}</span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock size={11} />{result.executionTime}ms
        </span>
      </div>
      <div className="grid grid-cols-1 divide-y divide-border">
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-1.5">Input</p>
          <pre className="text-xs font-mono text-foreground/80">{result.input ?? "[]"}</pre>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-1.5">Output</p>
          <pre className="text-xs font-mono text-foreground/80">{result.actual ?? "None"}</pre>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-1.5">Expected</p>
          <pre className="text-xs font-mono text-foreground/80">{result.expectedOutput ?? "0"}</pre>
        </div>
        {result.status !== "passed" && result.errorMessage && (
          <div className="p-3 bg-destructive/5">
            <p className="text-xs text-destructive font-medium mb-1">Error</p>
            <pre className="text-xs font-mono text-destructive/80">{result.errorMessage}</pre>
          </div>
        )}
      </div>
    </div>
  );

  const ScoreBlock = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums">
        {value}<span className="text-base text-muted-foreground font-normal">/{assignmentScore}</span>
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  const renderGrading = () => {
    const isGraded = submission.gradingStatus === "graded";

    const GradingCard = ({ children }: { children: React.ReactNode }) => (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Grading</h2>
        </div>
        <div className="p-5 space-y-5">{children}</div>
      </div>
    );

    if (gradingType === "Automatic") return (
      <GradingCard>
        <ScoreBlock label="System Score" value={submission.autoScore ?? 0} sub="Based on automated test results" />
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3">This assignment is automatically graded. The system score is final.</p>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("test-results")}>View Test Results</Button>
        </div>
      </GradingCard>
    );

    if (gradingType === "Manual") {
      if (isGraded) return (
        <GradingCard>
          <ScoreBlock label="Instructor Score" value={submission.manualScore ?? 0} sub="Manually graded by instructor" />
          {submission.feedback && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Feedback</p>
              <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">{submission.feedback}</div>
            </div>
          )}
        </GradingCard>
      );
      return (
        <GradingCard>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitGrade)} className="space-y-4">
              <FormField control={form.control} name="manualScore" render={({ field }) => (
                <FormItem>
                  <FormLabel>Score (0–{assignmentScore})</FormLabel>
                  <FormControl>
                    <input type="number" min={0} max={assignmentScore}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="feedback" render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provide feedback for the student…" className="min-h-28 resize-none" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full">Submit Grade</Button>
            </form>
          </Form>
        </GradingCard>
      );
    }

    if (gradingType === "Hybrid") {
      const hybridBanner = (
        <div className="p-3 bg-violet-500/8 border border-violet-500/25 rounded-lg">
          <p className="text-xs font-semibold text-violet-600 mb-0.5">Hybrid Grading</p>
          <p className="text-xs text-muted-foreground">
            {isGraded ? "Graded using both automated tests and instructor review." : "Auto-graded. Requires instructor review and final score."}
          </p>
        </div>
      );

      if (isGraded) return (
        <GradingCard>
          {hybridBanner}
          <ScoreBlock label="System Score" value={submission.autoScore ?? 0} sub="Automated tests" />
          <div className="pt-4 border-t border-border">
            <ScoreBlock label="Instructor Score" value={submission.manualScore ?? 0} sub="Manually graded" />
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Final Score</p>
            <p className="text-3xl font-bold text-violet-600 tabular-nums">
              {submission.finalScore ?? 0}<span className="text-base text-muted-foreground font-normal">/{assignmentScore}</span>
            </p>
          </div>
          {submission.feedback && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Feedback</p>
              <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">{submission.feedback}</div>
            </div>
          )}
        </GradingCard>
      );

      return (
        <GradingCard>
          {hybridBanner}
          <ScoreBlock label="System Score" value={submission.autoScore ?? 0} sub="Automated tests" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitGrade)} className="space-y-4 pt-4 border-t border-border">
              <FormField control={form.control} name="manualScore" render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor Score (0–{assignmentScore})</FormLabel>
                  <FormControl>
                    <input type="number" min={0} max={assignmentScore}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                </FormItem>
              )} />
              <div className="flex items-center justify-between text-sm px-3 py-2 bg-violet-500/8 border border-violet-500/25 rounded-lg">
                <span className="text-xs text-muted-foreground">Calculated final score</span>
                <span className="font-bold text-violet-600">{calculatedFinalScore}/{assignmentScore}</span>
              </div>
              <FormField control={form.control} name="feedback" render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provide feedback for the student…" className="min-h-28 resize-none" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full">Submit Grade</Button>
            </form>
          </Form>
        </GradingCard>
      );
    }

    return null;
  };

  const gradingMeta = GRADING_META[gradingType];
  const statusMeta  = STATUS_META[submission.gradingStatus] ?? { label: submission.gradingStatus, className: "text-[11px]" };
  const initials    = submission.studentName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="space-y-4">
      <button
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={onBack}
      >
        <ArrowLeft size={15} />
        Back to Submissions
      </button>

      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-bold">Submission Details</h2>
        <Badge className={gradingMeta.className}>{gradingMeta.label}</Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Left column */}
        <div className="flex-1 space-y-4">
          {/* Student card */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">{initials}</span>
              </div>
              <div>
                <p className="font-semibold text-sm">{submission.studentName}</p>
                <p className="text-xs text-muted-foreground">ID: {submission.studentId}</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground">{new Date(submission.submittedAt).toLocaleString()}</p>
              <div className="flex items-center justify-end gap-2">
                <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                {submission.gradingStatus === "graded" && submission.finalScore != null && (
                  <span className="text-sm font-mono font-bold">
                    {submission.finalScore}<span className="text-muted-foreground font-normal text-xs">/{assignmentScore}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 border border-border p-1 h-auto gap-1">
              <TabsTrigger value="code" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-1.5">
                <Code size={13} />Code
              </TabsTrigger>
              <TabsTrigger value="test-results" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-1.5">
                <FileText size={13} />Test Results
              </TabsTrigger>
              <TabsTrigger value="plagiarism" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm gap-1.5">
                <FileX size={13} />Plagiarism
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="mt-3">
              <div className="bg-[#1e1e1e] border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/8">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-xs text-white/40 font-mono">submission.py</span>
                </div>
                <pre className="overflow-auto text-sm p-4 max-h-[500px] font-mono text-white/85 leading-relaxed">
                  <code>{submission.code}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="test-results" className="mt-3">
              {submission.verdict.testResults ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    {submission.verdict.testResults.map((result, idx) => renderTestCase(result, idx))}
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span>Passed {submission.verdict.metrics.passedTests} of {submission.verdict.metrics.totalTests} tests</span>
                      <span className="font-bold">
                        {submission.verdict.metrics.totalTests > 0
                          ? Math.round((submission.verdict.metrics.passedTests / submission.verdict.metrics.totalTests) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={submission.verdict.metrics.totalTests > 0
                        ? (submission.verdict.metrics.passedTests / submission.verdict.metrics.totalTests) * 100
                        : 0}
                      className="h-1.5"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">No test results available.</div>
              )}
            </TabsContent>

            <TabsContent value="plagiarism" className="mt-3">
              {submission.plagiarismReports && submission.plagiarismReports.length > 0 ? (
                <div className="space-y-3">
                  {submission.plagiarismReports.map((report, idx) => {
                    const sim = report.similarity ?? 0;
                    const simMeta = sim >= 80
                      ? { className: "bg-destructive/15 text-destructive border-destructive/30 border text-[11px]" }
                      : sim >= 50
                      ? { className: "bg-amber-500/15 text-amber-600 border-amber-500/30 border text-[11px]" }
                      : { className: "bg-green-500/15 text-green-600 border-green-500/30 border text-[11px]" };
                    return (
                      <div key={idx} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Compared with #{report.comparedSubmission}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Checked {new Date(report.checkedAt).toLocaleString()}</p>
                        </div>
                        <Badge className={simMeta.className}>{sim}% match</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">No plagiarism reports available.</div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — grading */}
        <div className="w-full md:w-80 lg:w-96">{renderGrading()}</div>
      </div>
    </div>
  );
};

export default SubmissionDetailsView;
