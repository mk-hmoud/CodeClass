import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Calendar,
  BookOpen,
  BarChart,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OverviewTab from "@/components/instructor/assignment/view/OverviewTab";
import ProblemTab from "@/components/instructor/assignment/view/ProblemTab";
import SubmissionsTab from "@/components/instructor/assignment/view/SubmissionsTab";
import ExportTab from "@/components/instructor/assignment/view/ExportTab";
import { getAssignmentById } from "@/services/AssignmentService";
import { Assignment } from "@/types/Assignment";
import { FullSubmission } from "@/types/Submission";
import PlagiarismTab from "@/components/instructor/assignment/view/PlagiarismTab";

const InstructorAssignment: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<FullSubmission[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { classroomId } = useParams();
  useEffect(() => {
    if (!assignmentId) {
      setError("Invalid assignment ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    getAssignmentById(+assignmentId)
      .then((raw) => {
        if (!raw?.assignment) {
          throw new Error("Assignment not found");
        }
        console.log(raw);
        const transformedAssignment = {
          ...raw.assignment,
          dueDate: raw.assignment.due_date,
          publishDate: raw.assignment.publish_date,
          due_date: undefined,
          publish_date: undefined,
        };
        setAssignment(transformedAssignment);
        setSubmissions(raw.submissions || []);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load assignment");
        setAssignment(null);
      })
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleBack = () => {
    if (assignment) {
      navigate(`/instructor/classrooms/${assignment.classroomId}/view`);
    } else {
      navigate("/instructor");
    }
  };

  const handleEdit = () => {
    //navigate(`/instructor/edit-assignment/${assignmentId}`);
  };

  const formatDate = (d?: Date | string | number | null) => {
    console.log("here", assignment);
    if (!d) return "—";

    try {
      const date = d instanceof Date ? d : new Date(d);

      if (isNaN(date.getTime())) {
        return "—";
      }

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "—";
    }
  };

  const studentSubmissions = [];

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex flex-col">
      <div className="container mx-auto py-6 px-4">
        <Button variant="outline" className="mb-6 gap-2" onClick={handleBack}>
          <ArrowLeft size={16} /> Back to Classroom
        </Button>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          {/* Left side: Title and details */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {assignment?.title ?? "Loading…"}
              </h1>
            </div>
            {assignment && (
              <div className="flex mt-2 gap-4 text-gray-400">
                <div className="flex items-center gap-1">
                  <BookOpen size={14} />
                  <span>{assignment.points ?? 0} points</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Publish: {formatDate(assignment.publishDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>Due: {formatDate(assignment.dueDate)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {" "}
            <Button
              onClick={() =>
                navigate(
                  `/instructor/classrooms/${classroomId}/assignments/${assignmentId}/analytics`
                )
              }
              variant="outline"
              className="flex items-center"
            >
              <BarChart size={16} className="mr-2" /> <span>Analytics</span>
            </Button>
            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More Actions">
                  {" "}
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Assignment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Assignment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-[#0c121f] p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#123651]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="problem"
              className="data-[state=active]:bg-[#123651]"
            >
              Problem Details
            </TabsTrigger>
            <TabsTrigger
              value="submissions"
              className="data-[state=active]:bg-[#123651]"
            >
              Student Submissions
            </TabsTrigger>
            <TabsTrigger
              value="plagiarism"
              className="data-[state=active]:bg-[#123651]"
            >
              Plagiarism
            </TabsTrigger>
            <TabsTrigger
              value="export"
              className="data-[state=active]:bg-[#123651]"
            >
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {loading ? (
              <div>Loading overview…</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : assignment ? (
              <OverviewTab
                assignment={assignment}
                studentSubmissions={studentSubmissions}
                onEditAssignment={handleEdit}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="problem">
            {loading ? (
              <div>Loading problem…</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : assignment ? (
              <ProblemTab assignment={assignment} />
            ) : null}
          </TabsContent>

          <TabsContent value="submissions">
            {loading ? (
              <div>Loading submissions…</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : assignment ? (
              <SubmissionsTab
                assignmentScore={assignment.points}
                submissions={submissions}
                formatDate={formatDate}
                assignmentTitle={assignment.title}
                assignmentDescription={assignment.description}
                gradingType={assignment.grading_method}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="plagiarism">
            {assignment ? (
              <PlagiarismTab
                assignmentId={assignmentId || ""}
                plagiarism_detection={assignment.plagiarism_detection}
              />
            ) : (
              <div className="text-gray-400">No assignment loaded</div>
            )}
          </TabsContent>

          <TabsContent value="export">
            {assignment ? (
              <ExportTab assignment={assignment} students={submissions || []} />
            ) : (
              <div className="text-gray-400">No assignment to export</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InstructorAssignment;
