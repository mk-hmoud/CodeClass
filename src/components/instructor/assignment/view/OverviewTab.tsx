import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Assignment } from "../../../../types/Assignment";
import { LANGUAGE_LABELS } from "@/lib/assignmentUtils";

interface OverviewTabProps {
  assignment: Assignment;
  studentSubmissions: {
    id: number;
    submitted: boolean;
  }[];
  onEditAssignment: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  assignment,
  onEditAssignment,
}) => {
  const difficultyColorMap = {
    Easy: "bg-green-900/40 text-green-400 border-green-700",
    Medium: "bg-orange-900/40 text-orange-400 border-orange-700",
    Hard: "bg-red-900/40 text-red-400 border-red-700",
  };
  return (
    <div className="space-y-4">
      <Card className="bg-[#0d1224] border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assignment Overview</CardTitle>
            <Badge className={difficultyColorMap[assignment.difficulty_level]}>
              {assignment.difficulty_level}
            </Badge>
          </div>
          <CardDescription>
            Key information about this assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              Description
            </h3>
            <p className="whitespace-pre-line">{assignment.description}</p>
          </div>

          <Separator className="my-4 bg-gray-700" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Grading Method
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-900/30 text-blue-400 border-blue-700"
                >
                  {assignment.grading_method}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Plagiarism Detection
              </h3>{" "}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="bg-orange-900/30 text-orange-400 border-orange-700"
                >
                  {assignment.plagiarism_detection ? "On" : "Off"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4 bg-gray-700" />

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              Languages Allowed
            </h3>
            <div className="flex flex-wrap gap-2">
              {assignment.languages.map((lang, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-green-900/30 text-green-400 border-green-700"
                >
                  {LANGUAGE_LABELS[lang.language.name]}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
