import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { Problem } from "@/types/Problem";

interface ProblemCardProps {
  problem: Problem;
  onView: (problem: Problem) => void;
  onEdit: (problem: Problem, e: React.MouseEvent) => void;
  onDelete: (problem: Problem, e: React.MouseEvent) => void;
}

const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <Card
      className="bg-[#0d1224] border-gray-700 cursor-pointer hover:bg-[#131a30] transition-colors"
      onClick={() => onView(problem)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{problem.title}</h3>
            <p className="text-sm text-gray-400">
              Category: {problem.category || "Algorithms"}
            </p>
            <p className="mt-2 text-gray-300 line-clamp-2">
              {problem.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Edit Problem"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(problem, e);
              }}
            >
              <Edit size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-red-500"
              aria-label="Delete Problem"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(problem, e);
              }}
            >
              <Trash size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProblemCard;
