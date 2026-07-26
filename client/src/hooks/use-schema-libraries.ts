import { useEffect, useState } from "react";
import { SchemaLibrary } from "@/types/SchemaLibrary";
import {
  getSchemaLibraries,
  updateSchemaLibrary,
  deleteSchemaLibrary,
} from "@/services/SchemaLibraryService";
import { toast } from "sonner";

export function useSchemaLibraries() {
  const [schemaLibraries, setSchemaLibraries] = useState<SchemaLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getSchemaLibraries();
        setSchemaLibraries(data);
        setError(null);
      } catch (err) {
        setError("Failed to load schema libraries");
        toast.error("Failed to load schema libraries");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const update = async (edited: SchemaLibrary) => {
    try {
      const updated = await updateSchemaLibrary(edited);
      setSchemaLibraries((prev) =>
        prev.map((s) => (s.schemaLibraryId === edited.schemaLibraryId ? updated : s))
      );
      toast.success(`Schema library "${edited.name}" updated successfully`);
    } catch (err) {
      toast.error("Error updating schema library");
      throw err;
    }
  };

  const remove = async (schemaLibraryId: number) => {
    try {
      await deleteSchemaLibrary(schemaLibraryId);
      setSchemaLibraries((prev) => prev.filter((s) => s.schemaLibraryId !== schemaLibraryId));
      toast.success("Schema library deleted successfully");
    } catch (err) {
      toast.error("Failed to delete schema library");
      throw err;
    }
  };

  return { schemaLibraries, setSchemaLibraries, loading, error, update, remove };
}
