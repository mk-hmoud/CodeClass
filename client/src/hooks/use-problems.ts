import { useEffect, useState } from "react";
import { Problem } from "@/types/Problem";
import {
  getProblems,
  updateProblem,
  deleteProblem,
} from "@/services/ProblemService";
import { toast } from "sonner";

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProblems = async () => {
      setLoading(true);
      try {
        const data = await getProblems();
        setProblems(data);
        setError(null);
      } catch (err) {
        setError("Failed to load problems");
        toast.error("Failed to load problems");
      } finally {
        setLoading(false);
      }
    };
    loadProblems();
  }, []);

  const update = async (editedProblem: Problem) => {
    try {
      await updateProblem(editedProblem);
      setProblems((prev) =>
        prev.map((p) =>
          p.problemId === editedProblem.problemId ? editedProblem : p
        )
      );
      toast.success(`Problem "${editedProblem.title}" updated successfully`);
    } catch (err) {
      toast.error("Error updating problem");
      throw err;
    }
  };

  const remove = async (problemId: number) => {
    try {
      await deleteProblem(problemId);
      setProblems((prev) => prev.filter((p) => p.problemId !== problemId));
      toast.success("Problem deleted successfully");
    } catch (err) {
      toast.error("Failed to delete problem");
      throw err;
    }
  };

  return { problems, setProblems, loading, error, update, remove };
}
