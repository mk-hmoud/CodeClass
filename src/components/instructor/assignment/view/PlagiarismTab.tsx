import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import CodeSubmissionView from "../submission/CodeSubmissionView";
import { getAssignmentPlagiarismReports } from "../../../../services/PlagiarismService";
import { PlagiarismReport } from "@/types/Submission";
import { toast } from "@/components/ui/use-toast";

interface PlagiarismTabProps {
  assignmentId: string;
  plagiarism_detection: boolean;
}

const PlagiarismTab: React.FC<PlagiarismTabProps> = ({
  assignmentId,
  plagiarism_detection,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [thresholdFilter, setThresholdFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PlagiarismReport | null>(
    null
  );
  const [plagiarismReports, setPlagiarismReports] = useState<
    PlagiarismReport[]
  >([]);
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
      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }
      const reports = await getAssignmentPlagiarismReports(assignmentId);
      setPlagiarismReports(Array.isArray(reports) ? reports : []);
    } catch (error) {
      console.error("Failed to fetch plagiarism reports:", error);
      toast({
        title: "Error",
        description: "Failed to load plagiarism reports. Please try again.",
        variant: "destructive",
      });
      setPlagiarismReports([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Invalid date format:", error);
      return "Invalid date";
    }
  };

  const getSimilarityBadge = (similarity: number | null | undefined) => {
    const validSimilarity = typeof similarity === "number" ? similarity : 0;

    if (validSimilarity >= 75) {
      return <Badge className="bg-red-600">High ({validSimilarity}%)</Badge>;
    } else if (validSimilarity >= 50) {
      return (
        <Badge className="bg-orange-600">Medium ({validSimilarity}%)</Badge>
      );
    } else {
      return <Badge className="bg-blue-600">Low ({validSimilarity}%)</Badge>;
    }
  };

  const filteredReports = plagiarismReports.filter((report) => {
    const studentName = report?.studentName || "";
    const comparedStudentName = report?.comparedStudentName || "";
    const similarity = report?.similarity || 0;

    const matchesSearch =
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comparedStudentName.toLowerCase().includes(searchQuery.toLowerCase());

    if (thresholdFilter === "high") {
      return matchesSearch && similarity >= 75;
    } else if (thresholdFilter === "medium") {
      return matchesSearch && similarity >= 50 && similarity < 75;
    } else if (thresholdFilter === "low") {
      return matchesSearch && similarity < 50;
    }

    return matchesSearch;
  });

  const handleViewReport = (report: PlagiarismReport) => {
    setSelectedReport(report);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {plagiarism_detection ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Plagiarism Detection</CardTitle>
                  <CardDescription>
                    Check student submissions for code similarities and
                    potential plagiarism
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select
                    value={thresholdFilter}
                    onValueChange={setThresholdFilter}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by similarity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Similarities</SelectItem>
                      <SelectItem value="high">High (≥75%)</SelectItem>
                      <SelectItem value="medium">Medium (50-74%)</SelectItem>
                      <SelectItem value="low">Low (&lt;50%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg bg-[#0c121f]">
                  <p className="text-gray-400">Loading plagiarism reports...</p>
                </div>
              ) : filteredReports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Compared With</TableHead>
                      <TableHead>Similarity</TableHead>
                      <TableHead>Checked At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow
                        key={report?.reportId || `report-${Math.random()}`}
                      >
                        <TableCell className="font-medium">
                          {report?.studentName || "Unknown Student"}
                        </TableCell>
                        <TableCell>
                          {report?.comparedStudentName || "Unknown Student"}
                        </TableCell>
                        <TableCell>
                          {getSimilarityBadge(report?.similarity)}
                        </TableCell>
                        <TableCell>{formatDate(report?.checkedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReport(report)}
                          >
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg bg-[#0c121f]">
                  <p className="text-gray-400">No plagiarism reports found</p>
                </div>
              )}

              <div className="mt-6 text-sm text-gray-400">
                <p>
                  The system compares code submissions and generates similarity
                  scores based on syntax tokens and code fingerprints.
                </p>
                <p>
                  High similarity scores may indicate potential code sharing or
                  plagiarism that warrants further investigation.
                </p>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex justify-between items-center">
                  <span>
                    Plagiarism Report #{selectedReport?.reportId || "N/A"}
                  </span>
                  <DialogClose asChild></DialogClose>
                </DialogTitle>
                <DialogDescription>
                  {selectedReport && (
                    <div className="text-sm text-gray-400">
                      <span className="font-medium text-white">
                        {selectedReport?.studentName || "Unknown Student"}
                      </span>{" "}
                      and{" "}
                      <span className="font-medium text-white">
                        {selectedReport?.comparedStudentName ||
                          "Unknown Student"}
                      </span>{" "}
                      submissions have a{" "}
                      <span className="font-medium text-white">
                        {selectedReport?.similarity ?? 0}%
                      </span>{" "}
                      similarity score
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>

              {selectedReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      {selectedReport?.studentName || "Unknown Student"}'s
                      Submission
                    </h3>
                    <CodeSubmissionView
                      code={
                        selectedReport?.submission ||
                        "// No submission available"
                      }
                      language={
                        selectedReport?.submissionId?.toString() || "text"
                      }
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      {selectedReport?.comparedStudentName || "Unknown Student"}
                      's Submission
                    </h3>
                    <CodeSubmissionView
                      code={
                        selectedReport?.comparedSubmission?.toString() ||
                        "// No submission available"
                      }
                      language={
                        selectedReport?.comparedSubmissionId?.toString() ||
                        "text"
                      }
                    />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plagiarism Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg bg-[#0c121f]">
              <p className="text-gray-400">
                Plagiarism detection is not enabled for this assignment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlagiarismTab;
