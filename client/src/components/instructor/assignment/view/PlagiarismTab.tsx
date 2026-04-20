import React, { useState, useEffect } from "react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import CodeSubmissionView from "../submission/CodeSubmissionView";
import { getAssignmentPlagiarismReports } from "../../../../services/PlagiarismService";
import { PlagiarismReport } from "@/types/Submission";
import { toast } from "@/components/ui/use-toast";

interface PlagiarismTabProps {
  assignmentId: string;
  plagiarism_detection: boolean;
}

const getSimilarityMeta = (similarity: number | null | undefined) => {
  const v = typeof similarity === "number" ? similarity : 0;
  if (v >= 75) return { label: `High (${v}%)`,   className: "bg-destructive/15 text-destructive border-destructive/30 border text-[11px]" };
  if (v >= 50) return { label: `Medium (${v}%)`, className: "bg-amber-500/15 text-amber-600 border-amber-500/30 border text-[11px]" };
  return       { label: `Low (${v}%)`,           className: "bg-green-500/15 text-green-600 border-green-500/30 border text-[11px]" };
};

const fmtDate = (dateString: string | null | undefined) => {
  if (!dateString) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(dateString));
  } catch { return "Invalid date"; }
};

const PlagiarismTab: React.FC<PlagiarismTabProps> = ({ assignmentId, plagiarism_detection }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [thresholdFilter, setThresholdFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PlagiarismReport | null>(null);
  const [plagiarismReports, setPlagiarismReports] = useState<PlagiarismReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (plagiarism_detection && assignmentId) {
      fetchPlagiarismReports();
    } else {
      setPlagiarismReports([]);
      setLoading(false);
    }
  }, [assignmentId, plagiarism_detection]);

  const fetchPlagiarismReports = async () => {
    try {
      setLoading(true);
      const reports = await getAssignmentPlagiarismReports(assignmentId);
      setPlagiarismReports(Array.isArray(reports) ? reports : []);
    } catch {
      toast({ title: "Error", description: "Failed to load plagiarism reports.", variant: "destructive" });
      setPlagiarismReports([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = plagiarismReports.filter((report) => {
    const s = report?.studentName ?? "";
    const c = report?.comparedStudentName ?? "";
    const sim = report?.similarity ?? 0;
    const matchesSearch = s.toLowerCase().includes(searchQuery.toLowerCase()) || c.toLowerCase().includes(searchQuery.toLowerCase());
    if (thresholdFilter === "high")   return matchesSearch && sim >= 75;
    if (thresholdFilter === "medium") return matchesSearch && sim >= 50 && sim < 75;
    if (thresholdFilter === "low")    return matchesSearch && sim < 50;
    return matchesSearch;
  });

  if (!plagiarism_detection) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
          <ShieldOff size={18} className="text-muted-foreground" />
        </div>
        <p className="font-medium text-sm">Plagiarism Detection Disabled</p>
        <p className="text-xs text-muted-foreground">Enable plagiarism detection on this assignment to see similarity reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-sm">Plagiarism Detection</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Code similarity reports across all submissions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search students…"
                className="pl-8 h-8 text-sm w-52"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={thresholdFilter} onValueChange={setThresholdFilter}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Filter similarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High (≥75%)</SelectItem>
                <SelectItem value="medium">Medium (50–74%)</SelectItem>
                <SelectItem value="low">Low (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Loading reports…</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No plagiarism reports found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Compared With</TableHead>
                <TableHead>Similarity</TableHead>
                <TableHead>Checked At</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => {
                const meta = getSimilarityMeta(report?.similarity);
                return (
                  <TableRow key={report?.reportId ?? Math.random()}>
                    <TableCell className="font-medium text-sm">{report?.studentName ?? "Unknown"}</TableCell>
                    <TableCell className="text-sm">{report?.comparedStudentName ?? "Unknown"}</TableCell>
                    <TableCell><Badge className={meta.className}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-sm">{fmtDate(report?.checkedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedReport(report); setIsDialogOpen(true); }}>
                        View Report
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            High similarity scores may indicate potential code sharing. A score alone doesn't confirm plagiarism — always review manually.
          </p>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Plagiarism Report #{selectedReport?.reportId ?? "N/A"}</DialogTitle>
            {selectedReport && (
              <DialogDescription>
                <span className="font-medium text-foreground">{selectedReport.studentName ?? "Unknown"}</span>
                {" and "}
                <span className="font-medium text-foreground">{selectedReport.comparedStudentName ?? "Unknown"}</span>
                {" have a "}
                <span className="font-medium text-foreground">{selectedReport.similarity ?? 0}%</span>
                {" similarity score"}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm font-medium mb-2">{selectedReport.studentName ?? "Unknown"}'s Submission</p>
                <CodeSubmissionView
                  code={selectedReport.submission ?? "// No submission available"}
                  language={selectedReport.submissionId?.toString() ?? "text"}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{selectedReport.comparedStudentName ?? "Unknown"}'s Submission</p>
                <CodeSubmissionView
                  code={selectedReport.comparedSubmission?.toString() ?? "// No submission available"}
                  language={selectedReport.comparedSubmissionId?.toString() ?? "text"}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlagiarismTab;
