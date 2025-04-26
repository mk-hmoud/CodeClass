import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Users, Book, Calendar, Settings, PlusCircle } from "lucide-react";

import AssignmentsTab from "@/components/instructor/classroom/AssignmentsTab";
import StudentsTab from "@/components/instructor/classroom/StudentsTab";
import StatisticsTab from "@/components/instructor/classroom/StatisticsTab";

import { getClassroomById } from "../../services/ClassroomService";
import { Classroom } from "../../types/Classroom";
import { Assignment } from "../../types/Assignment";

interface Student {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: string;
  completionRate: number;
}

interface ClassStats {
  submissionsOverTime: {
    date: string;
    submissions: number;
  }[];
  assignmentCompletion: {
    assignment: string;
    completionRate: number;
  }[];
  studentEngagement: number;
  averageScore: number;
  assignmentsCreated: number;
  activeStudents: number;
}

const InstructorClassroom = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments");
  const [newAssignmentOpen, setNewAssignmentOpen] = useState(false);
  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
  const [deleteAssignmentOpen, setDeleteAssignmentOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment>({
    assignmentId: 0,
    classroomId: 0,
    problem: {
      problemId: 0,
      instructor: "",
      title: "",
      description: "",
      createdAt: new Date(),
      testCases: [],
    },
    title: "",
    description: "",
    difficulty_level: "Easy",
    grading_method: "Manual",
    plagiarism_detection: false,
    assigned_at: new Date(),
  });
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [classStats, setClassStats] = useState<ClassStats>({
    submissionsOverTime: [],
    assignmentCompletion: [],
    studentEngagement: 0,
    averageScore: 0,
    assignmentsCreated: 0,
    activeStudents: 0,
  });

  useEffect(() => {
    const fetchClassroom = async () => {
      if (!classroomId) return;
      setLoading(true);
      try {
        const fetchedClassroom = await getClassroomById(
          parseInt(classroomId, 10)
        );
        setClassroom(fetchedClassroom);

        if (fetchedClassroom.students) {
          const formattedStudents: Student[] = fetchedClassroom.students.map(
            (student) => ({
              id: student.email,
              name: student.name,
              email: student.email,
              status: "active",
              lastActive: student.enrollment_date,
              completionRate: 75,
            })
          );
          setStudents(formattedStudents);
        }

        const statsData: ClassStats = {
          submissionsOverTime: [
            { date: "2025-03-01", submissions: 5 },
            { date: "2025-03-08", submissions: 10 },
            { date: "2025-03-15", submissions: 8 },
            { date: "2025-03-22", submissions: 15 },
            { date: "2025-03-29", submissions: 12 },
          ],
          assignmentCompletion:
            fetchedClassroom.assignments?.map((a) => ({
              assignment: a.problem.title,
              completionRate: Math.floor(Math.random() * 100),
            })) || [],
          studentEngagement: 78,
          averageScore: 82,
          assignmentsCreated: fetchedClassroom.assignments?.length || 0,
          activeStudents: fetchedClassroom.students?.length || 0,
        };
        setClassStats(statsData);
      } catch (error) {
        toast.error("Failed to load classroom");
        console.error("Error fetching classroom:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClassroom();
  }, [classroomId]);

  useEffect(() => {
    if (!loading && !classroom) {
      navigate("/instructor/dashboard");
    }
  }, [loading, classroom, navigate]);

  if (loading) {
    return <div>Loading classroom...</div>;
  }
  if (!classroom) {
    return null;
  }

  const handleCreateAssignment = () => {
    if (!currentAssignment.problem.title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    const newAssignment = {
      assignmentId: 4,
      title: currentAssignment.title,
      due_date: currentAssignment.due_date,
      description: currentAssignment.description,
      submissions: 0,
      avgScore: 0,
      completed: false,
    } as Assignment;

    setClassroom({
      ...classroom,
      assignments: [...classroom.assignments, newAssignment],
    });
    setNewAssignmentOpen(false);
    setCurrentAssignment({
      assignmentId: Date.now(),
      classroomId: classroom?.id || 0,
      problem: { ...currentAssignment.problem },
      title: currentAssignment.title,
      description: currentAssignment.description,
      difficulty_level: currentAssignment.difficulty_level,
      grading_method: currentAssignment.grading_method || "Manual",
      plagiarism_detection: currentAssignment.plagiarism_detection,
      assigned_at: new Date(),
      due_date: currentAssignment.due_date,
      submissions: 0,
      avgScore: 0,
      completed: false,
    });
    toast.success("Assignment created successfully");
  };

  const openEditAssignment = (assignment) => {
    setCurrentAssignment({
      assignmentId: assignment.assignmentId,
      classroomId: assignment.classroomId,
      problem: assignment.problem,
      title: assignment.title,
      description: assignment.description,
      difficulty_level: assignment.difficulty_level,
      grading_method: assignment.grading_method,
      plagiarism_detection: assignment.plagiarism_detection,
      assigned_at: assignment.assigned_at,
      due_date: assignment.due_date,
    });
    setEditAssignmentOpen(true);
  };

  const handleUpdateAssignment = () => {
    if (!currentAssignment.title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    setClassroom({
      ...classroom,
      assignments: classroom.assignments.map((a) =>
        a.assignmentId === currentAssignment.assignmentId
          ? { ...a, ...currentAssignment }
          : a
      ),
    });
    setEditAssignmentOpen(false);
    toast.success("Assignment updated successfully");
  };

  const openDeleteAssignment = (assignment: Assignment) => {
    setCurrentAssignment({
      assignmentId: assignment.assignmentId,
      classroomId: assignment.classroomId,
      problem: assignment.problem,
      title: assignment.title,
      description: assignment.description,
      difficulty_level: assignment.difficulty_level,
      grading_method: assignment.grading_method,
      plagiarism_detection: assignment.plagiarism_detection,
      assigned_at: assignment.assigned_at,
      due_date: assignment.due_date,
    });
    setDeleteAssignmentOpen(true);
  };

  const handleDeleteAssignment = () => {
    setClassroom({
      ...classroom,
      assignments: classroom.assignments.filter(
        (a) => a.assignmentId !== currentAssignment.assignmentId
      ),
    });
    setDeleteAssignmentOpen(false);
    toast.success("Assignment deleted successfully");
  };

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formattedAssignments =
    classroom.assignments?.map((assignment) => ({
      id: assignment.assignmentId.toString(),
      title: assignment.title,
      dueDate: assignment.due_date,
      status: new Date(assignment.due_date) > new Date() ? "active" : "expired",
      submissionRate: Math.floor(Math.random() * 100),
    })) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/instructor/dashboard")}
              className="h-8 w-8"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <h1 className="text-3xl font-bold">{classroom.name}</h1>
            {classroom.active ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="secondary">Archived</Badge>
            )}
          </div>

          <div className="flex gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span>{classroom.students.length} Students</span>
            </div>
            <div className="flex items-center gap-1">
              <Book size={16} />
              <span>{classroom.assignments.length} Assignments</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>Created {formatDate(classroom.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            className="flex gap-2 items-center"
            onClick={() => {
              navigator.clipboard.writeText(classroom.code);
              toast.success("Class code copied to clipboard");
            }}
          >
            <span className="font-mono">{classroom.code}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </Button>
          <Button variant="outline" className="flex gap-2 items-center">
            <Settings size={16} />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="border-b border-gray-700">
          <TabsList className="bg-transparent">
            <TabsTrigger
              value="assignments"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#00b7ff] data-[state=active]:text-white rounded-none border-b-2 border-transparent px-4 py-2"
            >
              Assignments
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#00b7ff] data-[state=active]:text-white rounded-none border-b-2 border-transparent px-4 py-2"
            >
              Students
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#00b7ff] data-[state=active]:text-white rounded-none border-b-2 border-transparent px-4 py-2"
            >
              Statistics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="assignments" className="space-y-6">
          <AssignmentsTab classroom={classroom} />
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <StudentsTab students={students} formatDate={formatDate} />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <StatisticsTab stats={classStats} />
        </TabsContent>
      </Tabs>

      <Dialog open={newAssignmentOpen} onOpenChange={setNewAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                value={currentAssignment.title}
                onChange={(e) =>
                  setCurrentAssignment({
                    ...currentAssignment,
                    title: e.target.value,
                  })
                }
                placeholder="e.g. Binary Search Trees"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={
                  currentAssignment.due_date
                    ? currentAssignment.due_date.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setCurrentAssignment({
                    ...currentAssignment,
                    due_date: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
                  })
                }
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={currentAssignment.description}
                onChange={(e) =>
                  setCurrentAssignment({
                    ...currentAssignment,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the assignment..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewAssignmentOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment}>Create Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editAssignmentOpen} onOpenChange={setEditAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Assignment Title</Label>
              <Input
                id="edit-title"
                value={currentAssignment.title}
                onChange={(e) =>
                  setCurrentAssignment({
                    ...currentAssignment,
                    title: e.target.value,
                  })
                }
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-dueDate">Due Date</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={
                  currentAssignment.due_date
                    ? currentAssignment.due_date.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setCurrentAssignment({
                    ...currentAssignment,
                    due_date: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
                  })
                }
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={currentAssignment.description}
                onChange={(e) =>
                  setCurrentAssignment({
                    ...currentAssignment,
                    description: e.target.value,
                  })
                }
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditAssignmentOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateAssignment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteAssignmentOpen}
        onOpenChange={setDeleteAssignmentOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the assignment "
              {currentAssignment.title}"?
            </p>
            <p className="text-sm text-gray-400 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAssignmentOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAssignment}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorClassroom;
