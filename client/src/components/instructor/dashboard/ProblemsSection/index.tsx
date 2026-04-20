import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ProblemList from "./ProblemList";
import { BookOpen, Plus } from "lucide-react";
import ProblemDetailDialog from "./ProblemDetailDialog";
import { Problem } from "../../../../types/Problem";
import { useProblems } from "@/hooks/use-problems";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "@/components/ui/confirm-dialog";

const ProblemsSection = () => {
  const navigate = useNavigate();
  const { problems, loading, error, update, remove } = useProblems();
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [deleteProblemDialogOpen, setDeleteProblemDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleViewProblem = (problem: Problem) => {
    setCurrentProblem(problem);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditProblem = (problem: Problem) => {
    setCurrentProblem(problem);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const confirmDeleteProblem = (problem: Problem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentProblem(problem);
    setDeleteProblemDialogOpen(true);
  };

  const handleSaveProblem = async (editedProblem: Problem) => {
    try {
      await update(editedProblem);
      setDialogOpen(false);
    } catch {}
  };

  const handleDeleteProblem = async () => {
    try {
      if (currentProblem?.problemId) await remove(currentProblem.problemId as number);
      setDeleteProblemDialogOpen(false);
    } catch {}
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <BookOpen size={14} className="text-primary" />
          </div>
          <h2 className="font-semibold text-sm">Problems</h2>
          {!loading && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {problems.length}
            </span>
          )}
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => navigate("/instructor/problems/create")}>
          <Plus size={13} />
          New Problem
        </Button>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive text-center py-6">{error}</p>
        )}

        {!loading && !error && problems.length === 0 && (
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={18} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No problems yet</p>
            <Button size="sm" onClick={() => navigate("/instructor/problems/create")}>
              Create Your First Problem
            </Button>
          </div>
        )}

        {!loading && problems.length > 0 && (
          <ProblemList
            problems={problems}
            onView={handleViewProblem}
            onEdit={(problem, e) => { e.stopPropagation(); handleEditProblem(problem); }}
            onDelete={confirmDeleteProblem}
          />
        )}
      </div>

      <ProblemDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        problem={currentProblem}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onEdit={handleSaveProblem}
        onClose={() => setDialogOpen(false)}
        onDelete={confirmDeleteProblem}
      />

      <ConfirmDialog
        open={deleteProblemDialogOpen}
        title="Delete Problem"
        description={`Are you sure you want to delete "${currentProblem?.title}"? This cannot be undone.`}
        onCancel={() => setDeleteProblemDialogOpen(false)}
        onConfirm={handleDeleteProblem}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default ProblemsSection;
