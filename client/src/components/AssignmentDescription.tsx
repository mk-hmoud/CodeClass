import React from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface AssignmentDescriptionProps {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation: string;
  }>;
  constraints: string[];
  categories: string[];
}

const AssignmentDescription: React.FC<AssignmentDescriptionProps> = ({
  title,
  difficulty,
  description,
  examples,
  constraints,
  categories,
}) => {
  const difficultyColorMap = {
    Beginner: "bg-beginner-tag",
    Intermediate: "bg-intermediate-tag",
    Advanced: "bg-advanced-tag",
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Link
          to="/assignments"
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={18} />
          <span>Assignments</span>
        </Link>
        <div className="flex items-center gap-2 text-lg">
          <span className="text-muted-foreground">1.</span>
          <h2 className="font-medium">{title}</h2>
        </div>
        <div
          className={`${difficultyColorMap[difficulty]} text-xs font-medium ml-auto py-1 px-2 rounded-full text-black`}
        >
          {difficulty}
        </div>
      </div>

      <div className="px-6 py-4 text-sm text-foreground/90 space-y-6 overflow-y-auto">
        <div>
          <p className="whitespace-pre-line">{description}</p>
        </div>

        <div>
          <h3 className="font-medium text-base mb-3">Examples:</h3>
          <div className="space-y-4">
            {examples.map((example, index) => (
              <div
                key={index}
                className="space-y-1 font-mono border-l-2 border-primary/30 pl-3 py-1"
              >
                <div className="text-muted-foreground">
                  Input: {example.input}
                </div>
                <div className="text-muted-foreground">
                  Output: {example.output}
                </div>
                <div>
                  <span className="text-muted-foreground">Explanation:</span>{" "}
                  {example.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-base mb-3">Constraints:</h3>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-muted-foreground">
            {constraints.map((constraint, index) => (
              <li key={index}>{constraint}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-medium text-base mb-2">Categories:</h3>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category, index) => (
              <span
                key={index}
                className="bg-muted px-2 py-1 rounded-md text-xs"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDescription;
