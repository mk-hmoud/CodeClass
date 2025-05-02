import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Eye,
  Edit,
  BarChart,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { deleteAssignment } from "@/services/AssignmentService";

import { Classroom } from "../../../types/Classroom";
import { Assignment } from "../../../types/Assignment";
import { toast } from "sonner";

interface AssignmentsTabProps {
  classroom: Classroom;
  formatDate?: (date: string) => string;
}

const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  classroom,
  formatDate = (date) => new Date(date).toLocaleDateString(),
}) => {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    setAssignments(classroom.assignments);
  }, [classroom.assignments]);

  const handleCreateAssignment = () => {
    navigate(`/instructor/classrooms/${classroom.id}/assignments/create`);
  };

  const handleViewAssignment = (assignmentId: number) => {
    navigate(
      `/instructor/classrooms/${classroom.id}/assignments/${assignmentId}`
    );
  };

  const handleEditAssignment = (assignmentId: number) => {
    navigate(`/instructor/edit-assignment/${assignmentId}`);
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    try {
      await deleteAssignment(assignmentId);
      toast.success("Assignment deleted");
      setAssignments((cur) =>
        cur.filter((a) => a.assignmentId !== assignmentId)
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete assignment");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "upcoming":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Upcoming
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-400">
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Assignments</h2>
        <Button onClick={handleCreateAssignment} className="gap-2">
          <Plus size={16} />
          Create Assignment
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Current & Upcoming Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {classroom.assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submission Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classroom.assignments.map((assignment) => {
                  const dueDateObj = assignment.due_date
                    ? new Date(assignment.due_date)
                    : null;
                  const formattedDue = dueDateObj
                    ? formatDate(dueDateObj.toISOString())
                    : undefined;

                  let statusKey: string;
                  if (!dueDateObj) {
                    statusKey = "no due date";
                  } else if (dueDateObj > new Date()) {
                    statusKey = "active";
                  } else {
                    statusKey = "expired";
                  }

                  return (
                    <TableRow key={assignment.assignmentId}>
                      <TableCell className="font-medium">
                        {assignment.title}
                      </TableCell>
                      <TableCell>
                        {formattedDue ?? (
                          <span className="text-gray-400 italic">
                            No due date
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(statusKey)}</TableCell>
                      <TableCell>{assignment.submissions ?? 0}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleViewAssignment(assignment.assignmentId)
                            }
                          >
                            <Eye size={16} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleEditAssignment(assignment.assignmentId)
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <BarChart className="mr-2 h-4 w-4" />
                                View Statistics
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500"
                                onClick={() =>
                                  handleDeleteAssignment(
                                    assignment.assignmentId
                                  )
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No assignments yet.</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={handleCreateAssignment}
              >
                Create your first assignment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AssignmentsTab;
