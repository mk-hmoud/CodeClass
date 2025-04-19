import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { Eye, MessageSquare, BarChart } from "lucide-react";

interface Submission {
  id: number;
  name: string;
  submitted: boolean;
  status: string;
  score: number | null;
  submissionDate: string | null;
}

interface SubmissionsTabProps {
  studentSubmissions: Submission[];
  formatDate: (dateString: string | null) => string;
  onViewStatistics: () => void;
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({
  studentSubmissions,
  formatDate,
  onViewStatistics,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case "needs_review":
        return <Badge className="bg-amber-600">Needs Review</Badge>;
      case "not_started":
        return <Badge className="bg-gray-600">Not Started</Badge>;
      default:
        return <Badge className="bg-gray-600">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-[#0d1224] border-gray-700">
      <CardHeader>
        <CardTitle>Student Submissions</CardTitle>
        <CardDescription>
          Overview of all student submissions for this assignment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studentSubmissions.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{getStatusBadge(student.status)}</TableCell>
                <TableCell>
                  {student.score !== null ? `${student.score}%` : "N/A"}
                </TableCell>
                <TableCell>{formatDate(student.submissionDate)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {student.submitted && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View Submission"
                      >
                        <Eye size={16} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Send Message">
                      <MessageSquare size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-400">
          {studentSubmissions.filter((s) => s.status === "completed").length}{" "}
          completed,{" "}
          {studentSubmissions.filter((s) => s.status === "in_progress").length}{" "}
          in progress,{" "}
          {studentSubmissions.filter((s) => s.status === "needs_review").length}{" "}
          need review
        </div>
        <Button onClick={onViewStatistics}>
          <BarChart className="mr-2 h-4 w-4" />
          View Statistics
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubmissionsTab;
