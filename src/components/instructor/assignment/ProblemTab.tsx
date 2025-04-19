import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import ProblemDescription from "@/components/AssignmentDescription";

interface ProblemTabProps {
  assignment: {
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    description: string;
    examples: {
      input: string;
      output: string;
      explanation: string;
    }[];
    constraints: string[];
    categories: string[];
  };
}

const ProblemTab: React.FC<ProblemTabProps> = ({ assignment }) => {
  return (
    <Card className="bg-[#0d1224] border-gray-700">
      <CardContent className="p-0">
        <ProblemDescription
          title={assignment.title}
          difficulty={assignment.difficulty}
          description={assignment.description}
          examples={assignment.examples}
          constraints={assignment.constraints}
          categories={assignment.categories}
        />
      </CardContent>
    </Card>
  );
};

export default ProblemTab;
