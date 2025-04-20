import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Tag, Check, BookOpen } from "lucide-react";
import { Assignment } from "../../../../types/Assignment";

interface ProblemTabProps {
  assignment: Assignment;
}

const ProblemTab: React.FC<ProblemTabProps> = ({ assignment }) => {
  const difficultyColorMap = {
    Easy: "bg-green-900/40 text-green-400 border-green-700",
    Medium: "bg-orange-900/40 text-orange-400 border-orange-700",
    Hard: "bg-red-900/40 text-red-400 border-red-700",
  };
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

  return (
    <Card className="bg-[#0d1224] border-gray-700">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{assignment.title}</h2>
          <Badge className={difficultyColorMap[assignment.difficulty_level]}>
            {assignment.difficulty_level}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5" />
            <h3>Description</h3>
          </div>
          <div className="bg-[#0c121f] p-4 rounded-md">
            <p className="whitespace-pre-line text-gray-300">
              {assignment.description}
            </p>
          </div>
        </div>

        {assignment.problem.category && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Category</h3>
            <Badge
              variant="outline"
              className="bg-blue-900/30 text-blue-400 border-blue-700"
            >
              {assignment.problem.category}
            </Badge>
          </div>
        )}

        {prereqList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5" />
              <h3>Prerequisites</h3>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {prereqList.map((pr, i) => (
                <li key={i}>{pr}</li>
              ))}
            </ul>
          </div>
        )}

        {outcomeList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5" />
              <h3>Learning Outcomes</h3>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {outcomeList.map((lo, i) => (
                <li key={i}>{lo}</li>
              ))}
            </ul>
          </div>
        )}

        {tagList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Tag className="h-5 w-5" />
              <h3>Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-purple-900/30 text-purple-400 border-purple-700"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {assignment.problem.test_cases &&
          assignment.problem.test_cases.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Cases</h3>
              <div className="space-y-4">
                {assignment.problem.test_cases.map((testCase, index) => (
                  <div
                    key={testCase.testCaseId}
                    className="bg-[#0c121f] border border-gray-700 rounded-md p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">
                        Test Case #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {testCase.isPublic && (
                          <Badge
                            variant="outline"
                            className="bg-green-900/30 text-green-400 border-green-700"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm text-gray-400 mb-1">Input</h4>
                        <pre className="bg-[#0a0d17] p-2 rounded-md text-sm">
                          {testCase.input}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm text-gray-400 mb-1">
                          Expected Output
                        </h4>
                        <pre className="bg-[#0a0d17] p-2 rounded-md text-sm">
                          {testCase.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default ProblemTab;
