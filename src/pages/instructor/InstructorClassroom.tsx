import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Book, Calendar, Settings, BarChart } from "lucide-react";

import AssignmentsTab from "@/components/instructor/classroom/AssignmentsTab";
import StudentsTab from "@/components/instructor/classroom/StudentsTab";

import { getClassroomById } from "../../services/ClassroomService";
import { Classroom } from "../../types/Classroom";

interface Student {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: string;
  completionRate: number;
}

const InstructorClassroom = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments");

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [students, setStudents] = useState<Student[]>([]);

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

  const handleAssignmentDeleted = (assignmentId: number) => {
    if (classroom) {
      const updatedClassroom = {
        ...classroom,
        assignments: classroom.assignments.filter(
          (assignment) => assignment.assignmentId !== assignmentId
        ),
      };
      setClassroom(updatedClassroom);
    }
  };

  if (loading) {
    return <div>Loading classroom...</div>;
  }
  if (!classroom) {
    return null;
  }

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

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
          </div>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users size={16} className="mr-2 text-blue-400" />
              <span>{classroom.students.length} Students</span>
            </div>
            <div className="flex items-center gap-1">
              <Book size={16} className="mr-2 text-blue-400" />
              <span>{classroom.assignments.length} Assignments</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} className="mr-2 text-blue-400" />
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
          <Button
            onClick={() =>
              navigate(`/instructor/classrooms/${classroomId}/analytics`)
            }
            variant="outline"
            className="flex gap-2 items-center"
          >
            <BarChart size={16} className="mr-2" />
            <span>Analytics</span>
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
          </TabsList>
        </div>

        <TabsContent value="assignments" className="space-y-6">
          <AssignmentsTab
            classroom={classroom}
            onAssignmentDeleted={handleAssignmentDeleted}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <StudentsTab students={students} formatDate={formatDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstructorClassroom;
