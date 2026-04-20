import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullSubmission } from "@/types/Submission";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface SubmissionsListProps {
  assignmentScore: number;
  gradingType: "Automatic" | "Manual" | "Hybrid";
  submissions: FullSubmission[];
  onViewSubmission: (submissionId: number) => void;
  onGradeSubmission: (submissionId: number) => void;
}

const getStatusMeta = (status: string) => {
  switch (status) {
    case "graded":
      return { label: "Graded", className: "bg-green-500/15 text-green-600 border-green-500/30 border text-[11px]" };
    case "system graded":
      return { label: "System Graded", className: "bg-primary/15 text-primary border-primary/30 border text-[11px]" };
    case "pending":
      return { label: "Pending", className: "bg-amber-500/15 text-amber-600 border-amber-500/30 border text-[11px]" };
    default:
      return { label: status, className: "text-[11px]" };
  }
};

const fmtDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const SubmissionsList: React.FC<SubmissionsListProps> = ({
  assignmentScore,
  gradingType,
  submissions,
  onViewSubmission,
  onGradeSubmission,
}) => {
  const [activeTab, setActiveTab] = useState("all");

  const getDisplayScore = (sub: FullSubmission) =>
    sub.finalScore ?? sub.manualScore ?? sub.autoScore ?? null;

  const filtered = submissions.filter((s) => {
    if (activeTab === "pending") return s.gradingStatus === "pending" || s.gradingStatus === "system graded";
    if (activeTab === "graded") return s.gradingStatus === "graded";
    return true;
  });

  const pendingCount = submissions.filter(s => s.gradingStatus === "pending" || s.gradingStatus === "system graded").length;
  const gradedCount  = submissions.filter(s => s.gradingStatus === "graded").length;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border p-1 h-auto gap-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            All <span className="ml-1.5 text-xs text-muted-foreground">{submissions.length}</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            Pending <span className="ml-1.5 text-xs text-muted-foreground">{pendingCount}</span>
          </TabsTrigger>
          <TabsTrigger value="graded" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            Graded <span className="ml-1.5 text-xs text-muted-foreground">{gradedCount}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No submissions in this category.
            </div>
          ) : filtered.map((sub) => {
            const meta = getStatusMeta(sub.gradingStatus);
            const score = getDisplayScore(sub);
            const hasPlagiarism = sub.plagiarismReports?.some(r => r.similarity > 70);
            const initials = sub.studentName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

            return (
              <div key={sub.submissionId} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sub.studentName}</p>
                      <p className="text-xs text-muted-foreground">ID: {sub.studentId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-xs">{fmtDate(sub.submittedAt)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Badge className={meta.className}>{meta.label}</Badge>
                    {score !== null && (
                      <span className="text-sm font-mono font-semibold">
                        {score}<span className="text-muted-foreground text-xs font-normal">/{assignmentScore}</span>
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={sub.gradingStatus === "pending" ? "default" : "outline"}
                    onClick={() => sub.gradingStatus === "pending"
                      ? onGradeSubmission(sub.submissionId)
                      : onViewSubmission(sub.submissionId)
                    }
                  >
                    {sub.gradingStatus === "pending" ? "Grade" : "View"}
                  </Button>
                </div>

                {hasPlagiarism && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                    <AlertTriangle size={12} />
                    Potential plagiarism detected
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubmissionsList;
