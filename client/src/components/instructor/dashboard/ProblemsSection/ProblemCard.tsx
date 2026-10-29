import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash, Terminal } from "lucide-react";
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
      className="group bg-card border-border cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-colors flex flex-col h-full"
      onClick={() => onView(problem)}
    >
      <CardContent className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 flex-1">{problem.title}</h3>
          {/* Actions: quiet until hover so the grid stays clean. */}
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Edit problem"
              onClick={(e) => { e.stopPropagation(); onEdit(problem, e); }}
            >
              <Edit size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              aria-label="Delete problem"
              onClick={(e) => { e.stopPropagation(); onDelete(problem, e); }}
            >
              <Trash size={14} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{problem.category || "Algorithms"}</Badge>
          {problem.runtime === "systems" && (
            <Badge variant="outline" className="text-[10px] gap-1"><Terminal size={10} />systems</Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mt-auto">{problem.description}</p>
      </CardContent>
    </Card>
  );
};

export default ProblemCard;
