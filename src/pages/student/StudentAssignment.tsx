import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Clock,
  Check,
  ArrowRight,
  MessageSquare,
  BookOpen,
  Calendar,
  Tag,
  Code,
  GraduationCap,
  RotateCcw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAssignmentById,
  getRemainingAttempts,
} from "@/services/AssignmentService";
import { toast } from "sonner";
import { Assignment } from "@/types/Assignment";
import { Problem } from "@/types/Problem";
import { AssignmentLanguage } from "@/types/Language";
import { TestCase } from "@/types/TestCase";

const StudentAssignment = () => {
  const { classroomId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("description");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!assignmentId) return;
      setLoading(true);
      try {
        const raw = await getAssignmentById(parseInt(assignmentId, 10));
        const transformedAssignment = {
          ...raw.assignment,
          dueDate: raw.assignment.due_date,
          publishDate: raw.assignment.publish_date,
          due_date: undefined,
          publish_date: undefined,
        };
        setAssignment(transformedAssignment);
        const attempts = await getRemainingAttempts(parseInt(assignmentId, 10));
        setRemainingAttempts(attempts);
      } catch (error) {
        toast.error("Failed to load assignment");
        console.error("Error fetching assignment:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignment();
  }, [assignmentId, classroomId]);

  useEffect(() => {
    if (!loading && !assignment) {
      navigate("/student/dashboard");
    }
  }, [loading, assignment, navigate]);

  if (loading) {
    return <div>Loading classroom...</div>;
  }

  if (!assignment) {
    return null;
  }

  const publishDate = new Date(assignment.publishDate).getTime();
  const dueDate = new Date(assignment.dueDate).getTime();
  const timeLeft = Math.floor(
    Math.abs(Date.now() - dueDate) / (1000 * 60 * 60 * 24)
  );
  const timeLeftString = timeLeft > 1 ? `${timeLeft} days` : `${timeLeft} day`;
  const p = assignment.problem;
  const splitList = (value?: string, delimiter = ";") =>
    value
      ? value
          .split(delimiter)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const tagList = splitList(p.tags, ",");
  const prereqList = splitList(p.prerequisites, ";");
  const outcomeList = splitList(p.learning_outcomes, ";");

  // format date for display
  function formatDate(dateInput: string | number | undefined): string {
    if (dateInput == null) return "N/A";
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return "N/A";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }
  const handleStartCoding = () => {
    navigate(
      `/student/classrooms/${classroomId}/assignments/${assignmentId}/solve`,
      { state: assignment }
    );
  };

  const handleBackToClassroom = () => {
    navigate(`/student/classrooms/${classroomId}/view`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
      <div className="container mx-auto py-6 px-4">
        <Button
          variant="outline"
          className="mb-6 gap-2"
          onClick={handleBackToClassroom}
        >
          <ArrowLeft size={16} />
          Back to Classroom
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar with problem info */}
          <div className="md:col-span-1">
            <Card className="bg-[#0d1224] border-gray-700 shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h1 className="text-2xl font-bold">{assignment?.title}</h1>
                  <Badge
                    className={`
                    ${
                      assignment?.difficulty_level === "Easy"
                        ? "bg-green-900/40 text-green-400 border border-green-700"
                        : assignment?.difficulty_level === "Medium"
                        ? "bg-orange-900/40 text-orange-400 border border-orange-700"
                        : "bg-red-900/40 text-red-400 border border-red-700"
                    }`}
                  >
                    {assignment?.difficulty_level}
                  </Badge>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar size={16} />
                    <span>Published: {formatDate(publishDate)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={16} />
                    <span>Due: {formatDate(dueDate)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    <BookOpen size={16} />
                    <span>{assignment?.points} points</span>
                  </div>

                  {!assignment?.completed && (
                    <div className="flex items-center gap-2 text-amber-400">
                      <Clock size={16} />
                      <span>{timeLeftString} remaining</span>
                    </div>
                  )}

                  {assignment?.completed && (
                    <div className="flex items-center gap-2 text-green-400">
                      <Check size={16} />
                      <span>Completed</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4 bg-gray-700" />

                {/* Assignment details section */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-gray-400">
                      Category
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {assignment?.problem?.category && (
                        <Badge
                          variant="outline"
                          className="bg-blue-900/30 text-blue-400 border-blue-700"
                        >
                          {assignment.problem.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-gray-400">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tagList.map((tag, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-purple-900/30 text-purple-400 border-purple-700"
                        >
                          <Tag size={12} className="mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-gray-400">
                      Languages Allowed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {assignment?.languages?.map((alang, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-green-900/30 text-green-400 border-green-700"
                        >
                          <Code size={12} className="mr-1" />
                          {alang.language.name}
                          {alang.language.version &&
                            ` ${alang.language.version}`}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {assignment?.max_submissions !== undefined && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold text-gray-400">
                        Submission Attempts
                      </h3>
                      <div className="flex items-center gap-2">
                        <RotateCcw size={14} />
                        <span>
                          {remainingAttempts} / {assignment?.max_submissions}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-4 bg-gray-700" />

                <div className="flex flex-col gap-3 mt-4">
                  <Button className="w-full" onClick={handleStartCoding}>
                    Start Coding
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <MessageSquare size={16} />
                    Ask for Help
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Main content area */}
          <div className="md:col-span-2">
            <Card className="bg-[#0d1224] border-gray-700 shadow-lg h-full">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="h-full flex flex-col"
              >
                <div className="px-4 pt-4 border-b border-gray-700">
                  <TabsList className="bg-[#0c121f]">
                    <TabsTrigger
                      value="description"
                      className="data-[state=active]:bg-[#123651]"
                    >
                      Problem
                    </TabsTrigger>
                    <TabsTrigger
                      value="prerequisites"
                      className="data-[state=active]:bg-[#123651]"
                    >
                      Prerequisites
                    </TabsTrigger>
                    <TabsTrigger
                      value="learning"
                      className="data-[state=active]:bg-[#123651]"
                    >
                      Learning Outcomes
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value="description"
                  className="p-6 flex-1 overflow-y-auto m-0"
                >
                  <div>
                    <p>{assignment?.description}</p>
                    <strong>You will be solving the following problem</strong>
                  </div>
                  <div className="space-y-4 mt-5">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Title</h3>
                      <p>{assignment?.problem?.description}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-4">
                        Description
                      </h3>
                      <p>{assignment?.problem?.description}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value="prerequisites"
                  className="p-6 flex-1 overflow-y-auto m-0"
                >
                  <h3 className="text-xl font-semibold mb-4">Prerequisites</h3>
                  {prereqList.length > 0 ? (
                    <div className="space-y-4">
                      <div className="border border-gray-700 rounded-lg p-4 bg-[#0c121f]">
                        <ul className="list-disc pl-5 space-y-2">
                          {prereqList.map((prereq, idx) => (
                            <li key={idx}>{prereq}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No prerequisites.</p>
                  )}
                </TabsContent>

                <TabsContent
                  value="learning"
                  className="p-6 flex-1 overflow-y-auto m-0"
                >
                  <h3 className="text-xl font-semibold mb-4">
                    Learning Outcomes
                  </h3>
                  {outcomeList.length > 0 ? (
                    <div className="space-y-4">
                      <div className="border border-gray-700 rounded-lg p-4 bg-[#0c121f]">
                        <ul className="list-disc pl-5 space-y-2">
                          {outcomeList.map((outcome, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <GraduationCap
                                size={16}
                                className="mt-1 flex-shrink-0"
                              />
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">
                      No learning outcomes.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignment;
