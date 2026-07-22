import { useEffect, useState } from "react";
import { Library } from "@/types/Library";
import {
  getLibraries,
  updateLibrary,
  deleteLibrary,
} from "@/services/LibraryService";
import { toast } from "sonner";

export function useLibraries() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLibraries = async () => {
      setLoading(true);
      try {
        const data = await getLibraries();
        setLibraries(data);
        setError(null);
      } catch (err) {
        setError("Failed to load libraries");
        toast.error("Failed to load libraries");
      } finally {
        setLoading(false);
      }
    };
    loadLibraries();
  }, []);

  const update = async (editedLibrary: Library) => {
    try {
      const updated = await updateLibrary(editedLibrary);
      setLibraries((prev) =>
        prev.map((l) =>
          l.libraryId === editedLibrary.libraryId ? updated : l
        )
      );
      toast.success(`Library "${editedLibrary.name}" updated successfully`);
    } catch (err) {
      toast.error("Error updating library");
      throw err;
    }
  };

  const remove = async (libraryId: number) => {
    try {
      await deleteLibrary(libraryId);
      setLibraries((prev) => prev.filter((l) => l.libraryId !== libraryId));
      toast.success("Library deleted successfully");
    } catch (err) {
      toast.error("Failed to delete library");
      throw err;
    }
  };

  return { libraries, setLibraries, loading, error, update, remove };
}
