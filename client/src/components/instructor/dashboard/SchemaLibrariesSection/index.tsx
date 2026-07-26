import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import SchemaLibraryList from "./SchemaLibraryList";
import { Database, ChevronDown, ChevronUp, Plus } from "lucide-react";
import SchemaLibraryDetailDialog from "./SchemaLibraryDetailDialog";
import { SchemaLibrary } from "@/types/SchemaLibrary";
import { useSchemaLibraries } from "@/hooks/use-schema-libraries";
import { getSchemaLibraryById } from "@/services/SchemaLibraryService";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const SchemaLibrariesSection = () => {
  const navigate = useNavigate();
  const { schemaLibraries, loading, error, update, remove } = useSchemaLibraries();
  const [showSchemaLibraries, setShowSchemaLibraries] = useState(true);
  const [currentSchemaLibrary, setCurrentSchemaLibrary] = useState<SchemaLibrary | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const toggleSection = () => setShowSchemaLibraries(!showSchemaLibraries);

  const openNewSchemaLibraryDialog = () => {
    navigate("/instructor/schema-libraries/create");
  };

  const openSchemaLibraryDetails = async (schemaLibrary: SchemaLibrary, editing: boolean) => {
    try {
      const full = await getSchemaLibraryById(schemaLibrary.schemaLibraryId);
      setCurrentSchemaLibrary(full);
      setIsEditing(editing);
      setDialogOpen(true);
    } catch (error) {
      console.error("Error fetching schema library details:", error);
      toast.error("Failed to load schema library details");
    }
  };

  const handleView = (schemaLibrary: SchemaLibrary) => openSchemaLibraryDetails(schemaLibrary, false);
  const handleEdit = (schemaLibrary: SchemaLibrary) => openSchemaLibraryDetails(schemaLibrary, true);

  const confirmDelete = (schemaLibrary: SchemaLibrary, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSchemaLibrary(schemaLibrary);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (edited: SchemaLibrary) => {
    try {
      await update(edited);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error updating schema library:", error);
    }
  };

  const handleDelete = async () => {
    try {
      if (currentSchemaLibrary?.schemaLibraryId) {
        await remove(currentSchemaLibrary.schemaLibraryId);
      }
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting schema library:", error);
    }
  };

  return (
    <div className="bg-background text-foreground rounded-lg border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database size={20} />
            Schema Libraries
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSection}
            aria-label={showSchemaLibraries ? "Hide schema libraries" : "Show schema libraries"}
          >
            {showSchemaLibraries ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
        <Button className="gap-2" onClick={openNewSchemaLibraryDialog}>
          <Plus size={16} />
          Create Schema Library
        </Button>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-center text-red-500 py-4">{error}</div>}

      {showSchemaLibraries && schemaLibraries.length > 0 && (
        <SchemaLibraryList
          schemaLibraries={schemaLibraries}
          onView={handleView}
          onEdit={(schemaLibrary, e) => {
            e.stopPropagation();
            handleEdit(schemaLibrary);
          }}
          onDelete={confirmDelete}
        />
      )}

      {showSchemaLibraries && schemaLibraries.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border rounded-lg bg-background">
          <div className="bg-primary/10 rounded-full p-3 inline-flex mb-4">
            <Database className="text-primary" size={24} />
          </div>
          <p className="text-muted-foreground mb-4">No schema libraries found</p>
          <Button onClick={openNewSchemaLibraryDialog}>
            Create Your First Schema Library
          </Button>
        </div>
      )}

      <SchemaLibraryDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schemaLibrary={currentSchemaLibrary}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onEdit={handleSave}
        onClose={() => setDialogOpen(false)}
        onDelete={confirmDelete}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirm Schema Library Deletion"
        description={`Are you sure you want to delete the schema library "${currentSchemaLibrary?.name}"? Any test case linking it will fall back to having no setup SQL. This action cannot be undone.`}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default SchemaLibrariesSection;
