import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ProblemList from "./ProblemList";
import { Book, ChevronDown, ChevronUp, Plus } from "lucide-react";
import ProblemDetailDialog from "./ProblemDetailDialog";
import { Problem } from "../../../../types/problem/Problem";
import { useProblems } from "@/hooks/use-problems";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface ProblemsSectionProps {
  activeTab: string;
}

const ProblemsSection = ({ activeTab }: ProblemsSectionProps) => {
  const navigate = useNavigate();
  const { problems, setProblems, loading, error, update, remove } =
    useProblems();
  const [showProblems, setShowProblems] = useState(true);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [deleteProblemDialogOpen, setDeleteProblemDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    <div className="bg-[#0b0f1a] text-white rounded-lg border border-gray-800 p-6">
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
        <ProblemList
          problems={problems}
          onView={handleViewProblem}
          onEdit={(problem, e) => {
            e.stopPropagation();
            handleEditProblem(problem);
          }}
          onDelete={confirmDeleteProblem}
        />
      )}

      {showProblems && problems.length === 0 && (
        <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg bg-[#0c121f]">
          <div className="bg-[#123651]/20 rounded-full p-3 inline-flex mb-4">
            <Book className="text-[#00b7ff]" size={24} />
          </div>
          <p className="text-gray-400 mb-4">No problems found</p>
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
