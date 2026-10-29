import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProblemList from "./ProblemList";
import { Book, ChevronDown, ChevronUp, Plus, Search } from "lucide-react";
import ProblemDetailDialog from "./ProblemDetailDialog";
import { Problem } from "../../../../types/Problem";
import { useProblems } from "@/hooks/use-problems";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface ProblemsSectionProps {
  activeTab: string;
}

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
  >
    {children}
  </button>
);

const ProblemsSection = ({ activeTab }: ProblemsSectionProps) => {
  const navigate = useNavigate();
  const { problems, setProblems, loading, error, update, remove } =
    useProblems();
  const [showProblems, setShowProblems] = useState(true);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [deleteProblemDialogOpen, setDeleteProblemDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<string | null>(null);

  // Categories actually present, so the filter only offers what exists.
  const categories = useMemo(
    () => Array.from(new Set(problems.map((p) => p.category).filter(Boolean))) as string[],
    [problems]
  );
  const hasSystems = useMemo(() => problems.some((p) => p.runtime === "systems"), [problems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (category && p.category !== category) return false;
      if (runtime && (p.runtime ?? "standard") !== runtime) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.tags ?? "").toLowerCase().includes(q)
      );
    });
  }, [problems, query, category, runtime]);

  const toggleProblemsSection = () => {
    setShowProblems(!showProblems);
  };

  const openNewProblemDialog = () => {
    navigate("/instructor/problems/create");
  };

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
    } catch (error) {
      console.error("Error updating problem:", error);
    }
  };

  const handleDeleteProblem = async () => {
    try {
      if (currentProblem?.problemId) {
        await remove(currentProblem.problemId as number);
      }
      setDeleteProblemDialogOpen(false);
    } catch (error) {
      console.error("Error deleting problem:", error);
    }
  };

  return (
    <div className="bg-background text-foreground rounded-lg border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Book size={20} />
            Problems
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleProblemsSection}
            aria-label={showProblems ? "Hide problems" : "Show problems"}
          >
            {showProblems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
        <Button className="gap-2" onClick={() => openNewProblemDialog()}>
          <Plus size={16} />
          Create Problem
        </Button>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-center text-red-500 py-4">{error}</div>}

      {showProblems && problems.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.length > 0 && (
                <>
                  <Chip active={category === null} onClick={() => setCategory(null)}>All</Chip>
                  {categories.map((c) => (
                    <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>{c}</Chip>
                  ))}
                </>
              )}
              {hasSystems && (
                <Chip active={runtime === "systems"} onClick={() => setRuntime(runtime === "systems" ? null : "systems")}>systems</Chip>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            {filtered.length} of {problems.length} problem{problems.length === 1 ? "" : "s"}
          </p>

          {filtered.length > 0 ? (
            <ProblemList
              problems={filtered}
              onView={handleViewProblem}
              onEdit={(problem, e) => {
                e.stopPropagation();
                handleEditProblem(problem);
              }}
              onDelete={confirmDeleteProblem}
            />
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">No problems match your search.</div>
          )}
        </>
      )}

      {showProblems && problems.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border rounded-lg bg-background">
          <div className="bg-primary/10 rounded-full p-3 inline-flex mb-4">
            <Book className="text-primary" size={24} />
          </div>
          <p className="text-muted-foreground mb-4">No problems found</p>
          <Button onClick={() => openNewProblemDialog()}>
            Create Your First Problem
          </Button>
        </div>
      )}

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
        title="Confirm Problem Deletion"
        description={`Are you sure you want to delete the problem "${currentProblem?.title}"? This action cannot be undone.`}
        onCancel={() => setDeleteProblemDialogOpen(false)}
        onConfirm={handleDeleteProblem}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default ProblemsSection;
