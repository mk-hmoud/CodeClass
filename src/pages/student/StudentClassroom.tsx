import React, { useEffect, useState, useMemo } from "react";
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
  Calendar,
  AlertCircle,
  Eye,
  FileText,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getClassroomById } from "../../services/ClassroomService";
import { Classroom } from "../../types/Classroom";
import { Assignment } from "../../types/Assignment";
import { toast } from "sonner";

type AssignmentFilter = "all" | "completed" | "not-completed";

const StudentClassroom: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<AssignmentFilter>("all");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const totalAssignments = useParams();

  const getButtonClass = (assignment: Assignment): string => {
    if (assignment.completed) {
      return "bg-green-500/20 text-green-400 hover:bg-green-500/30";
    }
    const isActive = assignment.dueDate
      ? getDaysRemaining(assignment.dueDate.toString()) > 0
      : true;
    if (!isActive) {
      return "bg-red-500/20 text-red-400 hover:bg-red-500/30";
    }
    return "";
  };

  const getCardBorderClass = (assignment: Assignment): string => {
    if (assignment.completed) {
      return "border-green-500/50";
    }
    const isActive = assignment.dueDate
      ? getDaysRemaining(assignment.dueDate.toString()) > 0
      : true;
    if (!isActive) {
      return "border-red-500/50";
    }
    return "border-gray-700";
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.completed) {
      return (
        <Badge className="bg-green-900/40 text-green-400 border border-green-700">
          Completed
        </Badge>
      );
    } else if (assignment.dueDate) {
      const isActive = getDaysRemaining(assignment.dueDate.toString()) > 0;
      return isActive ? (
        <Badge className="bg-blue-900/40 text-blue-400 border border-blue-700">
          Active
        </Badge>
      ) : (
        <Badge className="bg-red-900/40 text-red-400 border border-red-700">
          Expired
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-900/40 text-gray-400 border border-gray-700">
          No Due Date
        </Badge>
      );
    }
  };

  const filteredAssignments = useMemo(() => {
    const assignments = classroom?.assignments ?? [];

    switch (activeFilter) {
      case "completed":
        return assignments.filter((a) => a.completed);
      case "not-completed":
        return assignments.filter((a) => !a.completed);
      case "all":
      default:
        return assignments;
    }
  }, [classroom, activeFilter]);
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

  useEffect(() => {
    if (!loading && !classroom) {
      navigate("/student/dashboard");
    }
  }, [loading, classroom, navigate]);

  if (loading) {
    return <div>Loading classroom...</div>;
  }

  if (!classroom) {
    return null;
  }

  const now = new Date();
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(now.getDate() + 7);

  const upcomingAssignments: Assignment[] = classroom.assignments
    .filter((a) => {
      if (!a.dueDate || a.completed) return false;
      const due = new Date(a.dueDate);
      return due > now && due <= oneWeekFromNow;
    })
    .sort((a, b) => {
      return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
    });

  const completionRate =
    classroom.assignments.length > 0
      ? Math.round(
          (classroom.completedAssignments / classroom.assignments.length) * 100
        )
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
    navigate(
      `/student/classrooms/${classroomId}/assignments/${assignmentId}/view`
    );
  };

  const getButtonContent = (assignment: Assignment) => {
    if (assignment.completed) {
      return (
        <>
          <FileText size={16} className="mr-2" />
          View Feedback
        </>
      );
    }

    const isExpired =
      assignment.dueDate &&
      getDaysRemaining(assignment.dueDate.toString()) <= 0;

    if (isExpired) {
      return (
        <>
          <Eye size={16} className="mr-2" />
          View Assignment (Late)
        </>
      );
    }

    return "Solve Assignment";
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
                    {classroom.completedAssignments}
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
                        {assignment.dueDate ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-900/30 text-amber-400 border-amber-700"
                          >
                            Due {formatDate(assignment.dueDate.toString())}
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
                        {assignment.dueDate
                          ? getDaysRemaining(assignment.dueDate.toString()) <= 1
                            ? "Due today!"
                            : `${getDaysRemaining(
                                assignment.dueDate.toString()
                              )} days left`
                          : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Assignments</h2>

            <Tabs
              defaultValue="all"
              value={activeFilter}
              onValueChange={(value) =>
                setActiveFilter(value as AssignmentFilter)
              }
              className="w-full"
            >
              <TabsList className="w-full bg-[#0d1224] border border-gray-800 mb-6">
                <TabsTrigger
                  value="all"
                  className="flex-1 data-[state=active]:bg-blue-600"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="flex-1 data-[state=active]:bg-green-600"
                >
                  Completed
                </TabsTrigger>
                <TabsTrigger
                  value="not-completed"
                  className="flex-1 data-[state=active]:bg-amber-600"
                >
                  Not Completed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => {
                      const isExpired =
                        assignment.dueDate &&
                        getDaysRemaining(assignment.dueDate.toString()) <= 0 &&
                        !assignment.completed;

                      return (
                        <Card
                          key={assignment.assignmentId}
                          className={`bg-[#0d1224] border-2 hover:border-opacity-80 transition-all ${getCardBorderClass(
                            assignment
                          )} ${isExpired ? "bg-red-950/10" : ""}`}
                        >
                          <CardHeader
                            className={`flex flex-row items-start justify-between pb-2 ${
                              isExpired ? "border-b border-red-800/30" : ""
                            }`}
                          >
                            <CardTitle className="text-white flex items-center gap-2">
                              {assignment.completed ? (
                                <CheckCircle
                                  className="text-green-500"
                                  size={16}
                                />
                              ) : isExpired ? (
                                <AlertCircle
                                  className="text-red-500"
                                  size={16}
                                />
                              ) : null}
                              {assignment.title}
                            </CardTitle>
                            <div className="flex flex-col gap-2 items-end">
                              {getStatusBadge(assignment)}
                              {isExpired && (
                                <Badge
                                  variant="outline"
                                  className="text-red-400 border-red-700 bg-red-900/20"
                                >
                                  <Clock size={12} className="mr-1" /> Overdue
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-between text-sm mt-2 mb-3">
                              <div className="text-gray-400">
                                <span className="text-white font-medium">
                                  {assignment.points}
                                </span>{" "}
                                points
                              </div>
                              <div
                                className={`${
                                  isExpired ? "text-red-400" : "text-gray-400"
                                }`}
                              >
                                Due:{" "}
                                {assignment.dueDate ? (
                                  formatDate(assignment.dueDate.toString())
                                ) : (
                                  <span className="italic text-gray-500">
                                    No due date
                                  </span>
                                )}
                              </div>
                            </div>

                            {assignment.completed && (
                              <div className="bg-green-900/20 border border-green-700 rounded-md p-3 mb-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-green-400">
                                    Your grade
                                  </span>
                                  <span className="text-xl font-bold text-green-400">
                                    {4}/{assignment.points}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isExpired && (
                              <div className="bg-red-900/20 border border-red-800 rounded-md p-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <Calendar
                                    size={16}
                                    className="text-red-400"
                                  />
                                  <span className="text-red-400">
                                    Deadline passed{" "}
                                    {Math.abs(
                                      getDaysRemaining(
                                        assignment.dueDate.toString()
                                      )
                                    )}{" "}
                                    day
                                    {Math.abs(
                                      getDaysRemaining(
                                        assignment.dueDate.toString()
                                      )
                                    ) !== 1
                                      ? "s"
                                      : ""}{" "}
                                    ago
                                  </span>
                                </div>
                              </div>
                            )}

                            {!assignment.completed &&
                              !isExpired &&
                              assignment.dueDate && (
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                  <Clock size={14} />
                                  {getDaysRemaining(
                                    assignment.dueDate.toString()
                                  ) <= 1 ? (
                                    <span className="text-amber-400">
                                      Due soon!
                                    </span>
                                  ) : (
                                    `${getDaysRemaining(
                                      assignment.dueDate.toString()
                                    )} days remaining`
                                  )}
                                </div>
                              )}
                          </CardContent>
                          <Separator
                            className={`mb-4 ${
                              isExpired ? "bg-red-800/50" : "bg-gray-800"
                            }`}
                          />
                          <CardFooter className="pt-2">
                            <Button
                              className={`w-full flex items-center justify-center ${getButtonClass(
                                assignment
                              )}`}
                              variant={
                                assignment.completed || isExpired
                                  ? "outline"
                                  : "default"
                              }
                              onClick={() =>
                                handleAssignmentClick(assignment.assignmentId)
                              }
                            >
                              {getButtonContent(assignment)}
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="col-span-3 text-center py-10 bg-[#0d1224] border border-gray-700 rounded-lg">
                      <p className="text-gray-400">
                        No assignments in this category
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => (
                      <Card
                        key={assignment.assignmentId}
                        className="bg-[#0d1224] border-2 border-green-500/50 hover:border-green-500/70 transition-all"
                      >
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                          <CardTitle className="text-white flex items-center gap-2">
                            <CheckCircle className="text-green-500" size={16} />
                            {assignment.title}
                          </CardTitle>
                          <Badge className="bg-green-900/40 text-green-400 border border-green-700">
                            Completed
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between text-sm mt-2 mb-3">
                            <div className="text-gray-400">
                              <span className="text-white font-medium">
                                {assignment.points}
                              </span>{" "}
                              points
                            </div>
                            <div className="text-gray-400">
                              Due:{" "}
                              {assignment.dueDate ? (
                                formatDate(assignment.dueDate.toString())
                              ) : (
                                <span className="italic text-gray-500">
                                  No due date
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-green-900/20 border border-green-700 rounded-md p-3 mb-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-green-400">
                                Your grade
                              </span>
                              <span className="text-xl font-bold text-green-400">
                                {4}/{assignment.points}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <Separator className="mb-4 bg-green-800/30" />
                        <CardFooter className="pt-2">
                          <Button
                            className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center justify-center"
                            variant="outline"
                            onClick={() =>
                              handleAssignmentClick(assignment.assignmentId)
                            }
                          >
                            <FileText size={16} className="mr-2" />
                            View Feedback
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-10 bg-[#0d1224] border border-gray-700 rounded-lg">
                      <p className="text-gray-400">No completed assignments</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="not-completed" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => {
                      const isExpired = assignment.status === "expired";

                      return (
                        <Card
                          key={assignment.assignmentId}
                          className={`bg-[#0d1224] border-2 hover:border-opacity-80 transition-all ${
                            isExpired
                              ? "border-red-500/50 bg-red-950/10"
                              : "border-gray-700"
                          }`}
                        >
                          <CardHeader
                            className={`flex flex-row items-start justify-between pb-2 ${
                              isExpired ? "border-b border-red-800/30" : ""
                            }`}
                          >
                            <CardTitle className="text-white flex items-center gap-2">
                              {isExpired && (
                                <AlertCircle
                                  className="text-red-500"
                                  size={16}
                                />
                              )}
                              {assignment.title}
                            </CardTitle>
                            <div className="flex flex-col gap-2 items-end">
                              <div className="mb-3">
                                {getStatusBadge(assignment)}
                              </div>

                              {isExpired && (
                                <Badge
                                  variant="outline"
                                  className="text-red-400 border-red-700 bg-red-900/20"
                                >
                                  <Clock size={12} className="mr-1" /> Overdue
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-between text-sm mt-2 mb-3">
                              <div className="text-gray-400">
                                <span className="text-white font-medium">
                                  {assignment.points}
                                </span>{" "}
                                points
                              </div>
                              <div
                                className={`${
                                  isExpired ? "text-red-400" : "text-gray-400"
                                }`}
                              >
                                Due:{" "}
                                {assignment.dueDate ? (
                                  formatDate(assignment.dueDate.toString())
                                ) : (
                                  <span className="italic text-gray-500">
                                    No due date
                                  </span>
                                )}
                              </div>
                            </div>

                            {isExpired ? (
                              <div className="bg-red-900/20 border border-red-800 rounded-md p-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <Calendar
                                    size={16}
                                    className="text-red-400"
                                  />
                                  <span className="text-red-400">
                                    Deadline passed{" "}
                                    {Math.abs(
                                      getDaysRemaining(
                                        assignment.dueDate.toString()
                                      )
                                    )}{" "}
                                    day
                                    {Math.abs(
                                      getDaysRemaining(
                                        assignment.dueDate.toString()
                                      )
                                    ) !== 1
                                      ? "s"
                                      : ""}{" "}
                                    ago
                                  </span>
                                </div>
                              </div>
                            ) : (
                              assignment.dueDate && (
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                  <Clock size={14} />
                                  {getDaysRemaining(
                                    assignment.dueDate.toString()
                                  ) <= 1 ? (
                                    <span className="text-amber-400">
                                      Due soon!
                                    </span>
                                  ) : (
                                    `${getDaysRemaining(
                                      assignment.dueDate.toString()
                                    )} days remaining`
                                  )}
                                </div>
                              )
                            )}
                          </CardContent>
                          <Separator
                            className={`mb-4 ${
                              isExpired ? "bg-red-800/50" : "bg-gray-800"
                            }`}
                          />
                          <CardFooter className="pt-2">
                            <Button
                              className={`w-full flex items-center justify-center ${
                                isExpired
                                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                  : ""
                              }`}
                              variant={isExpired ? "outline" : "default"}
                              onClick={() =>
                                handleAssignmentClick(assignment.assignmentId)
                              }
                            >
                              {isExpired ? (
                                <>
                                  <Eye size={16} className="mr-2" />
                                  View Assignment (Late)
                                </>
                              ) : (
                                "Solve Assignment"
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="col-span-3 text-center py-10 bg-[#0d1224] border border-gray-700 rounded-lg">
                      <p className="text-gray-400">No pending assignments</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentClassroom;
