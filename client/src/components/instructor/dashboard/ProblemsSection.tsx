import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Book,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Trash,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import ProblemDetailDialog from "./ProblemDetailDialog";
import { Problem } from "../../../types/Problem";
import {
  createProblem,
  deleteProblem,
  getProblems,
  updateProblem,
} from "@/services/ProblemService";
import { useNavigate } from "react-router-dom";

interface ProblemsSectionProps {
  activeTab: string;
}

const ProblemsSection = ({ activeTab }: ProblemsSectionProps) => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showProblems, setShowProblems] = useState(true);
  const [problemDialogOpen, setProblemDialogOpen] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<Partial<Problem>>({
    title: "",
    description: "",
  });
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [deleteProblemDialogOpen, setDeleteProblemDialogOpen] = useState(false);
  const [viewProblemDialogOpen, setViewProblemDialogOpen] = useState(false);

  useEffect(() => {
    const loadProblems = async () => {
      try {
        const data = await getProblems();
        setProblems(data);
      } catch (error) {
        console.error("Failed to fetch problems:", error);
        toast.error("Failed to load problems");
      }
    };
    loadProblems();
  }, []);

  const toggleProblemsSection = () => {
    setShowProblems(!showProblems);
  };

  const openNewProblemDialog = () => {
    setCurrentProblem({
      title: "",
      description: "",
      category: undefined,
      prerequisites: "",
      learning_outcomes: "",
      tags: "",
    });
    setIsEditingProblem(false);
    setProblemDialogOpen(true);
  };

  const openEditProblemDialog = (problem: Problem) => {
    setCurrentProblem({ ...problem });
    setIsEditingProblem(true);
    setProblemDialogOpen(true);
  };

  const openViewProblemDialog = (problem: Problem) => {
    setCurrentProblem({ ...problem });
    setViewProblemDialogOpen(true);
  };

  const confirmDeleteProblem = (problem: Problem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentProblem(problem);
    setDeleteProblemDialogOpen(true);
  };

  const handleEditProblem = async (editedProblem: Problem) => {
    try {
      await updateProblem(editedProblem);
      toast.success(`Problem "${editedProblem.title}" updated successfully`);
      setProblems(
        problems.map((p) =>
          p.problemId === editedProblem.problemId ? editedProblem : p
        )
      );
      setViewProblemDialogOpen(false);
    } catch (error) {
      console.error("Error updating problem:", error);
      toast.error("Error updating problem");
    }
  };

  const handleSaveProblem = async () => {
    if (!currentProblem.title?.trim()) {
      toast.error("Please enter a problem title");
      return;
    }
    try {
      if (isEditingProblem && currentProblem.problemId) {
        const updatedProblem = currentProblem as Problem;
        await updateProblem(updatedProblem);
        setProblems(
          problems.map((p) =>
            p.problemId === updatedProblem.problemId ? updatedProblem : p
          )
        );
        toast.success(`Problem "${updatedProblem.title}" updated successfully`);
      } else {
        const newProblemData = {
          title: currentProblem.title,
          description: currentProblem.description,
          category: currentProblem.category,
          prerequisites: currentProblem.prerequisites,
          learning_outcomes: currentProblem.learning_outcomes,
          tags: currentProblem.tags,
          testCases: currentProblem.testCases,
        };
        const result = await createProblem(newProblemData);
        const updatedProblems = await getProblems();
        setProblems(updatedProblems);
        toast.success(`Problem "${currentProblem.title}" created successfully`);
      }
      setProblemDialogOpen(false);
    } catch (error) {
      console.error("Error saving problem:", error);
      toast.error("Error saving problem");
    }
  };

  const handleDeleteProblem = async () => {
    try {
      if (currentProblem.problemId) {
        await deleteProblem(currentProblem.problemId);
        setProblems(
          problems.filter((p) => p.problemId !== currentProblem.problemId)
        );
        toast.success(`Problem "${currentProblem.title}" deleted successfully`);
      }
      setDeleteProblemDialogOpen(false);
    } catch (error) {
      console.error("Error deleting problem:", error);
      toast.error("Failed to delete problem");
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
        <Button
          className="gap-2" /*onClick={() => openNewProblemDialog()}*/
          onClick={() => navigate("/instructor/problems/create")}
        >
          <Plus size={16} />
          Create Problem
        </Button>
      </div>

      {showProblems && problems.length > 0 && (
        <div className="space-y-4">
          {problems.map((problem) => {
            return (
              <Card
                key={problem.problemId}
                className="bg-[#0d1224] border-gray-700 cursor-pointer hover:bg-[#131a30] transition-colors"
                onClick={() => openViewProblemDialog(problem)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{problem.title}</h3>
                      <p className="text-sm text-gray-400">
                        Category: Algorithm | Difficulty: Medium
                      </p>
                      <p className="mt-2 text-gray-300 line-clamp-2">
                        {problem.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditProblemDialog(problem);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500"
                        onClick={(e) => confirmDeleteProblem(problem, e)}
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
        open={viewProblemDialogOpen}
        onOpenChange={setViewProblemDialogOpen}
        currentProblem={
          currentProblem.problemId ? (currentProblem as Problem) : null
        }
        onEdit={handleEditProblem}
        onClose={() => setViewProblemDialogOpen(false)}
      />

      <Dialog open={problemDialogOpen} onOpenChange={setProblemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditingProblem ? "Edit Problem" : "Create New Problem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="assignment-title">
                Problem Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="assignment-title"
                value={currentProblem.title}
                onChange={(e) =>
                  setCurrentProblem({
                    ...currentProblem,
                    title: e.target.value,
                  })
                }
                placeholder="e.g. Binary Search Tree Implementation"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="assignment-description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="assignment-description"
                value={currentProblem.description}
                onChange={(e) =>
                  setCurrentProblem({
                    ...currentProblem,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the problem..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProblemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProblem}>
              {isEditingProblem ? "Save Changes" : "Create Problem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteProblemDialogOpen}
        onOpenChange={setDeleteProblemDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Problem Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the problem "
              {currentProblem?.title}"?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteProblemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProblem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProblemsSection;
