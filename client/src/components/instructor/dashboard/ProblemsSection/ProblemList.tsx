import React from "react";
import { Problem } from "../../../../types/problem/Problem";
import ProblemCard from "./ProblemCard";

interface ProblemListProps {
  problems: Problem[];
  onView: (problem: Problem) => void;
  onEdit: (problem: Problem, e: React.MouseEvent) => void;
  onDelete: (problem: Problem, e: React.MouseEvent) => void;
}

const ProblemList: React.FC<ProblemListProps> = ({
  problems,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      {problems.map((problem) => (
        <ProblemCard
          key={problem.problemId}
          problem={problem}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default ProblemList;
