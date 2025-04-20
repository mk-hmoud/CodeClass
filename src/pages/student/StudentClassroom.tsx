import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CheckCircle,
  BookOpen,
  GraduationCap,
  Clock,
} from "lucide-react";
import AuthenticatedNav from "@/components/AuthenticatedNav";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getClassroomById } from "../../services/ClassroomService";
import { Classroom } from "../../types/Classroom";
import { Assignment } from "../../types/Assignment";
import { toast } from "sonner";

const StudentClassroom: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Fetch classroom data on mount
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!classroomId) return;
      setLoading(true);
      try {
        const fetchedClassroom = await getClassroomById(
          parseInt(classroomId, 10)
        );
        setClassroom({
          ...fetchedClassroom,
          announcements: fetchedClassroom.announcements || [],
          discussions: fetchedClassroom.discussions || [],
        });
      } catch (error) {
        toast.error("Failed to load classroom");
        console.error("Error fetching classroom:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClassroom();
  }, [classroomId]);

  // Redirect if loading is done and classroom is still null
  useEffect(() => {
    if (!loading && !classroom) {
      navigate("/student/dashboard");
    }
  }, [loading, classroom, navigate]);

  if (loading) {
    return <div>Loading classroom...</div>;
  }

  // If not loading but classroom is null, return null (redirection is handled in useEffect)
  if (!classroom) {
    return null;
  }

  // Calculate upcoming assignments
  const now = new Date();
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(now.getDate() + 7);

  const upcomingAssignments: Assignment[] = classroom.assignments
    .filter((a) => {
      if (!a.due_date || a.completed) return false;
      const due = new Date(a.due_date);
      return due > now && due <= oneWeekFromNow;
    })
    .sort((a, b) => {
      return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
    });

  const completedAssignments = classroom.assignments.filter(
    (a) => a.completed
  ).length;
  const completionRate =
    classroom.assignments.length > 0
      ? Math.round((completedAssignments / classroom.assignments.length) * 100)
      : 0;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getDaysRemaining = (dateString: string): number => {
    const now = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleAssignmentClick = (assignmentId: number) => {
    navigate(`/student/classrooms/${classroomId}/assignments/${assignmentId}`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="outline"
            className="mb-6 gap-2"
            onClick={() => navigate("/student/dashboard")}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>

          <div className="bg-[#0d1224] border border-gray-800 rounded-lg p-6 mb-8 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">{classroom.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400">Class Code:</span>
                  <span className="font-mono bg-gray-800 px-2 py-1 rounded text-[#00b7ff] border border-[#00b7ff]/30">
                    {classroom.code}
                  </span>
                </div>
                <p className="text-gray-400 mt-1">
                  Instructor: {classroom.instructor}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0c121f] border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="bg-blue-500/20 rounded-full p-3">
                  <BookOpen className="text-blue-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Assignments</p>
                  <p className="text-xl font-semibold">
                    {classroom.assignments.length}
                  </p>
                </div>
              </div>

              <div className="bg-[#0c121f] border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="bg-green-500/20 rounded-full p-3">
                  <CheckCircle className="text-green-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-xl font-semibold">
                    {completedAssignments}
                  </p>
                </div>
              </div>

              <div className="bg-[#0c121f] border border-gray-700 rounded-lg p-4 flex items-center gap-3">
                <div className="bg-purple-500/20 rounded-full p-3">
                  <GraduationCap className="text-purple-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Completion Rate</p>
                  <p className="text-xl font-semibold">{completionRate}%</p>
                </div>
              </div>
            </div>

            {upcomingAssignments.length > 0 && (
              <div className="mt-6 bg-[#0c121f] border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <Clock size={18} className="text-amber-400" />
                  Upcoming Deadlines
                </h3>
                <div className="space-y-2">
                  {upcomingAssignments.map((assignment) => (
                    <div
                      key={assignment.assignmentId}
                      className="flex justify-between items-center border-b border-gray-700 pb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{assignment.title}</span>
                        {assignment.due_date ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-900/30 text-amber-400 border-amber-700"
                          >
                            Due {formatDate(assignment.due_date.toString())}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-gray-500 italic"
                          >
                            No due date
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-amber-400">
                        {assignment.due_date
                          ? getDaysRemaining(assignment.due_date.toString()) <=
                            1
                            ? "Due today!"
                            : `${getDaysRemaining(
                                assignment.due_date.toString()
                              )} days left`
                          : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="mb-6 border border-gray-700 bg-[#0d1224]">
              <TabsTrigger
                value="assignments"
                className="data-[state=active]:bg-[#123651]"
              >
                Assignments
              </TabsTrigger>
              <TabsTrigger
                value="announcements"
                className="data-[state=active]:bg-[#123651]"
              >
                Announcements
              </TabsTrigger>
              <TabsTrigger
                value="discussions"
                className="data-[state=active]:bg-[#123651]"
              >
                Discussions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classroom.assignments.map((Assignment) => (
                  <Card
                    key={Assignment.assignmentId}
                    className={`bg-[#0d1224] border-gray-700 hover:border-gray-600 transition-colors
                      ${Assignment.completed ? "border-green-500/50" : ""}`}
                  >
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <CardTitle className="text-white flex items-center gap-2">
                        {Assignment.completed && (
                          <CheckCircle className="text-green-500" size={16} />
                        )}
                        {Assignment.title}
                      </CardTitle>
                      <Badge
                        className={`
                        ${
                          Assignment.completed
                            ? "bg-green-900/40 text-green-400 border border-green-700"
                            : Assignment.difficulty_level === "Easy"
                            ? "bg-green-900/40 text-green-400 border border-green-700"
                            : Assignment.difficulty_level === "Medium"
                            ? "bg-orange-900/40 text-orange-400 border border-orange-700"
                            : "bg-red-900/40 text-red-400 border border-red-700"
                        }`}
                      >
                        {Assignment.completed
                          ? "Completed"
                          : Assignment.difficulty_level}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm mt-2 mb-3">
                        <div className="text-gray-400">
                          <span className="text-white font-medium">
                            {Assignment.points}
                          </span>{" "}
                          points
                        </div>
                        <div className="text-gray-400">
                          Due:{" "}
                          {Assignment.due_date ? (
                            formatDate(Assignment.due_date.toString())
                          ) : (
                            <span className="italic text-gray-500">
                              No due date
                            </span>
                          )}
                        </div>
                      </div>

                      {Assignment.completed && (
                        <div className="bg-green-900/20 border border-green-700 rounded-md p-3 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-400">
                              Your grade
                            </span>
                            <span className="text-xl font-bold text-green-400">
                              {4}/{Assignment.points}
                            </span>
                          </div>
                        </div>
                      )}

                      {!Assignment.completed && Assignment.due_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                          <Clock size={14} />
                          {getDaysRemaining(Assignment.due_date.toString()) <=
                          1 ? (
                            <span className="text-amber-400">Due soon!</span>
                          ) : (
                            `${getDaysRemaining(
                              Assignment.due_date.toString() || "1"
                            )} days remaining`
                          )}
                        </div>
                      )}
                    </CardContent>
                    <Separator className="mb-4 bg-gray-800" />
                    <CardFooter className="pt-2">
                      <Button
                        className={`w-full ${
                          Assignment.completed
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : ""
                        }`}
                        variant={Assignment.completed ? "outline" : "default"}
                        onClick={() =>
                          handleAssignmentClick(Assignment.assignmentId)
                        }
                      >
                        {Assignment.completed
                          ? "Review Solution"
                          : "Solve Assignment"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="announcements">
              <div className="bg-[#0d1224] border border-gray-700 rounded-lg p-6 shadow-md">
                {classroom.announcements.length > 0 ? (
                  <div className="space-y-4">
                    {classroom.announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="border border-gray-700 rounded-lg p-4 bg-[#0c121f]"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">
                            {announcement.title}
                          </h3>
                          <span className="text-xs text-gray-400">
                            {formatDate(announcement.date)}
                          </span>
                        </div>
                        <p className="text-gray-300">{announcement.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No announcements yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="discussions">
              <div className="bg-[#0d1224] border border-gray-700 rounded-lg p-6 shadow-md">
                {classroom.discussions.length > 0 ? (
                  <div className="space-y-4">
                    {classroom.discussions.map((discussion) => (
                      <div
                        key={discussion.id}
                        className="border border-gray-700 rounded-lg p-4 bg-[#0c121f] hover:border-gray-600 cursor-pointer transition-colors"
                      >
                        <h3 className="font-semibold">{discussion.title}</h3>
                        <div className="flex justify-between mt-2 text-sm text-gray-400">
                          <span>{discussion.responses} responses</span>
                          <span>
                            Last activity: {formatDate(discussion.lastActivity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No discussions yet</p>
                    <Button className="mt-4">Start a discussion</Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default StudentClassroom;
