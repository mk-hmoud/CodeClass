import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Book,
  Calendar,
  GraduationCap,
  Clock,
  AlertTriangle,
  BarChart,
  Code,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import CodeEditorBase from "@/components/editors/CodeEditorBase";

import { Classroom } from "../../types/Classroom";
import { getClassrooms } from "../../services/ClassroomService";
import { joinClassroom } from "../../services/ClassroomService";

const upcomingDeadlines = [
  {
    id: "p1",
    title: "Binary Search Tree Implementation",
    course: "Advanced Algorithms",
    dueDate: "2023-06-10",
    status: "Not Started",
  },
  {
    id: "p2",
    title: "Responsive Layout Challenge",
    course: "Web Development",
    dueDate: "2023-06-12",
    status: "In Progress",
  },
  {
    id: "p3",
    title: "Dynamic Programming assignment",
    course: "Advanced Algorithms",
    dueDate: "2023-06-15",
    status: "Not Started",
  },
];

const lastOpenedAssignment = {
  id: "a1",
  title: "Binary Search Tree Implementation",
  course: "Advanced Algorithms",
  code: "function insertNode(root, value) {\n  if (root === null) {\n    return { value, left: null, right: null };\n  }\n\n  if (value < root.value) {\n    root.left = insertNode(root.left, value);\n  } else if (value > root.value) {\n    root.right = insertNode(root.right, value);\n  }\n\n  return root;\n}",
  language: "javascript",
};

const StudentDashboard = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classCode, setClassCode] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        setLoading(true);
        const fetchedClassrooms = await getClassrooms();
        setClassrooms(fetchedClassrooms);
      } catch (error) {
        toast.error("Failed to load classrooms");
        console.error("Error fetching classrooms:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClassrooms();
  }, []);

  const uncompletedAssignments = classrooms.reduce((total, classroom) => {
    const completedCount = Math.floor(
      classroom.assignments_num * (classroom.completion / 100)
    );
    return total + (classroom.assignments_num - completedCount);
  }, 0);

  const sortedDeadlines = [...upcomingDeadlines].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let badgeVariant: "default" | "destructive" | "outline" | "secondary" =
      "default";
    if (diffDays <= 3) badgeVariant = "destructive";
    else if (diffDays <= 7) badgeVariant = "secondary";

    return {
      formatted: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date),
      daysLeft: diffDays,
      badgeVariant,
    };
  };

  const handleJoinClassroom = async () => {
    if (!classCode.trim()) {
      toast.error("Please enter a class code");
      return;
    }
    try {
      setJoining(true);
      await joinClassroom(classCode.trim());
      const updatedClassrooms = await getClassrooms();
      setClassrooms(updatedClassrooms);

      setClassCode("");
      setOpen(false);
      toast.success("Successfully joined classroom!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join classroom"
      );
    } finally {
      setJoining(false);
    }
  };

  const handleClassroomClick = (classroomId) => {
    navigate(`/student/classrooms/${classroomId}/view`);
  };

  const handleViewStatistics = (classroomId) => {
    navigate(`/student/statistics/${classroomId}`);
  };

  const handleContinueAssignment = () => {
    if (lastOpenedAssignment) {
      navigate(`/code-editor/${lastOpenedAssignment.id}`);
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">Join Classroom</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Classroom</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="class-code">Enter Class Code</Label>
                <Input
                  id="class-code"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="e.g. ABC123"
                  className="mt-2 font-mono"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Ask your instructor for the class code
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleJoinClassroom}>Join</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0c121f] border border-gray-700 rounded-lg p-4 flex items-center gap-3">
            <div className="bg-blue-500/20 rounded-full p-3">
              <Book className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Enrolled Courses</p>
              <p className="text-xl font-semibold">{classrooms.length}</p>
            </div>
          </div>

          <div className="bg-[#0c121f] border border-gray-700 rounded-lg p-4 flex items-center gap-3">
            <div className="bg-amber-500/20 rounded-full p-3">
              <AlertTriangle className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Uncompleted assignments</p>
              <p className="text-xl font-semibold">{uncompletedAssignments}</p>
            </div>
          </div>

          <div className="bg-[#0c121f] border border-gray-700 rounded-lg p-4 flex items-center gap-3">
            <div className="bg-purple-500/20 rounded-full p-3">
              <Clock className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Upcoming Deadlines</p>
              <p className="text-xl font-semibold">{sortedDeadlines.length}</p>
            </div>
          </div>
        </div>

        {/* Quick Resume Section */}
        {lastOpenedAssignment && (
          <div className="bg-[#0d1224] border border-gray-800 rounded-lg p-6 mb-8 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Code size={20} className="text-blue-400" />
              Continue Working
            </h2>
            <div className="mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">
                    {lastOpenedAssignment.title}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Course: {lastOpenedAssignment.course}
                  </p>
                </div>
                <Button onClick={handleContinueAssignment}>
                  Continue Assignment
                </Button>
              </div>
            </div>
            <div className="bg-[#0c121f] border border-gray-700 rounded-lg overflow-hidden h-[200px]">
              <CodeEditorBase
                defaultLanguage={lastOpenedAssignment.language}
                defaultValue={lastOpenedAssignment.code}
              />
            </div>
          </div>
        )}

        <div className="bg-[#0d1224] border border-gray-800 rounded-lg p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-amber-400" />
            Approaching Deadlines
          </h2>

          {sortedDeadlines.length > 0 ? (
            <div className="space-y-4">
              {sortedDeadlines.map((deadline) => {
                const date = formatDate(deadline.dueDate);

                return (
                  <div
                    key={deadline.id}
                    className="bg-[#0c121f] border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium">{deadline.title}</h3>
                      <Badge variant={date.badgeVariant} className="ml-2">
                        {date.daysLeft <= 0
                          ? "Due today"
                          : `${date.daysLeft} days left`}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      Course: {deadline.course}
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">
                        Due: {date.formatted}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-gray-800 text-gray-300"
                      >
                        {deadline.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="mx-auto mb-2 opacity-40" />
              <p>No upcoming deadlines</p>
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen size={20} />
          My Classrooms
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom) => (
            <Card
              key={classroom.id}
              className="bg-[#0d1224] border-gray-700 hover:border-[#00b7ff] transition-colors cursor-pointer"
              onClick={() => handleClassroomClick(classroom.id)}
            >
              <CardHeader>
                <CardTitle className="text-white">{classroom.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 mb-4">
                  Instructor: {classroom.instructor}
                </p>
                <div className="flex justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <BookOpen size={16} />
                    <span>{classroom.assignments_num} assignments</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>Active</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={classroom.completion} className="h-2" />
                </div>
                <div className="mt-1 text-right text-xs text-gray-400">
                  {classroom.completion}% complete
                </div>
              </CardContent>
              <Separator className="bg-gray-800" />
              <CardFooter className="pt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClassroomClick(classroom.id);
                  }}
                >
                  View Classroom
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStatistics(classroom.id);
                  }}
                  title="View Statistics"
                >
                  <BarChart size={16} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

function setLoading(arg0: boolean) {
  throw new Error("Function not implemented.");
}
