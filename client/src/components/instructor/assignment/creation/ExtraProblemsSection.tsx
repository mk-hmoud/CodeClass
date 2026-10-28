import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, GripVertical, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProblems } from "@/services/ProblemService";
import { Problem } from "@/types/Problem";

export interface ExtraProblemDraft {
  problem: Problem;
  points: number;
}

interface ExtraProblemsSectionProps {
  /** The primary problem chosen in Basic Information (shown as problem #1). */
  primaryProblem: Problem | null;
  /** Points the primary problem is worth (the form's `points` field). */
  primaryPoints: number;
  onChange: (extras: ExtraProblemDraft[]) => void;
}

const ADD_PLACEHOLDER = "__add__";

/**
 * Lets an instructor turn a single-problem assignment into a multi-problem one
 * by appending further problems, each worth its own points. The primary problem
 * from Basic Information is always problem #1; this manages #2 onward.
 */
const ExtraProblemsSection: React.FC<ExtraProblemsSectionProps> = ({
  primaryProblem,
  primaryPoints,
  onChange,
}) => {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [extras, setExtras] = useState<ExtraProblemDraft[]>([]);

  useEffect(() => {
    getProblems()
      .then(setAllProblems)
      .catch((e) => console.error("Error fetching problems:", e));
  }, []);

  useEffect(() => {
    onChange(extras);
  }, [extras, onChange]);

  // If the primary problem changes to one that's also in extras, drop it there.
  useEffect(() => {
    if (!primaryProblem) return;
    setExtras((prev) => prev.filter((e) => e.problem.problemId !== primaryProblem.problemId));
  }, [primaryProblem]);

  const takenIds = new Set<number>([
    ...(primaryProblem ? [primaryProblem.problemId] : []),
    ...extras.map((e) => e.problem.problemId),
  ]);
  const available = allProblems.filter((p) => !takenIds.has(p.problemId));

  const addProblem = (problemId: string) => {
    const p = allProblems.find((x) => String(x.problemId) === problemId);
    if (!p) return;
    setExtras((prev) => [...prev, { problem: p, points: primaryPoints || 100 }]);
  };

  const removeProblem = (problemId: number) =>
    setExtras((prev) => prev.filter((e) => e.problem.problemId !== problemId));

  const setPoints = (problemId: number, points: number) =>
    setExtras((prev) =>
      prev.map((e) => (e.problem.problemId === problemId ? { ...e, points } : e))
    );

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Additional Problems</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={14} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Add more problems to make this a multi-problem assignment (like a
                  lab with several exercises). Each problem is attempted and graded
                  on its own; the attempt limit applies per problem.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Ordered list: primary first, then extras. */}
        <ol className="space-y-2">
          <li className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <GripVertical size={14} className="text-muted-foreground shrink-0" />
            <span className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">1</span>
            <span className="flex-1 min-w-0 text-sm font-medium truncate">
              {primaryProblem?.title ?? <span className="text-muted-foreground italic">Select a problem above</span>}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{primaryPoints || 0} pts</span>
            <span className="w-7 shrink-0" />
          </li>

          {extras.map((e, i) => (
            <li key={e.problem.problemId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <GripVertical size={14} className="text-muted-foreground shrink-0" />
              <span className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">{i + 2}</span>
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{e.problem.title}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  type="number"
                  min={1}
                  value={e.points}
                  onChange={(ev) => setPoints(e.problem.problemId, Number(ev.target.value))}
                  className="h-8 w-20 text-sm"
                />
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
              <button
                type="button"
                onClick={() => removeProblem(e.problem.problemId)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                aria-label="Remove problem"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ol>

        {/* Add control */}
        <Select value={ADD_PLACEHOLDER} onValueChange={addProblem}>
          <SelectTrigger className="w-full">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Plus size={15} />
              <SelectValue placeholder="Add another problem…">Add another problem…</SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent>
            {available.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No more problems available</div>
            ) : (
              available.map((p) => (
                <SelectItem key={p.problemId} value={String(p.problemId)}>
                  {p.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default ExtraProblemsSection;
