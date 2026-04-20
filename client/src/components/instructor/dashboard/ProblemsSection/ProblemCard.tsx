import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash } from "lucide-react";
import { Problem } from "@/types/Problem";

interface ProblemCardProps {
  problem: Problem;
  onView: (problem: Problem) => void;
  onEdit: (problem: Problem, e: React.MouseEvent) => void;
  onDelete: (problem: Problem, e: React.MouseEvent) => void;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem, onView, onEdit, onDelete }) => {
  const tagList = problem.tags
    ? problem.tags.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="group flex items-start justify-between gap-4 px-4 py-3.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => onView(problem)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium truncate">{problem.title}</p>
          {problem.category && (
            <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/8 shrink-0">
              {problem.category}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{problem.description}</p>
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tagList.slice(0, 4).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-violet-500/30 text-violet-600 bg-violet-500/8">
                {tag}
              </Badge>
            ))}
            {tagList.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{tagList.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Edit Problem"
          onClick={(e) => { e.stopPropagation(); onEdit(problem, e); }}
        >
          <Edit size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          aria-label="Delete Problem"
          onClick={(e) => { e.stopPropagation(); onDelete(problem, e); }}
        >
          <Trash size={13} />
        </Button>
      </div>
    </div>
  );
};

export default ProblemCard;
