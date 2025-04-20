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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, CheckCircle, BookOpen, Edit, Tag } from "lucide-react";
import { Assignment } from "../../../../types/Assignment";

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
  studentSubmissions,
  onEditAssignment,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0d1224] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} />
              Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {studentSubmissions.filter((s) => s.submitted).length}/
              {studentSubmissions.length}
            </div>
            <p className="text-gray-400">students have submitted</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0d1224] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle size={18} />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{NaN}%</div>
            <p className="text-gray-400">students have completed</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0d1224] border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen size={18} />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{NaN}%</div>
            <p className="text-gray-400">among completed submissions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0d1224] border-gray-700">
        <CardHeader>
          <CardTitle>Assignment Overview</CardTitle>
          <CardDescription>
            Key information about this assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-900/30 text-blue-400 border-blue-700"
                >
                  {assignment.problem.category}
                </Badge>
              </div>
            </div>

            {assignment.problem.tags && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {assignment.problem.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag, idx) => (
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
            )}
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
                  {lang.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onEditAssignment}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Assignment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OverviewTab;
