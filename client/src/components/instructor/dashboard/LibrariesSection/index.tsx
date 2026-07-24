import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import LibraryList from "./LibraryList";
import { Library as LibraryIcon, ChevronDown, ChevronUp, Plus } from "lucide-react";
import LibraryDetailDialog from "./LibraryDetailDialog";
import { Library } from "@/types/Library";
import { useLibraries } from "@/hooks/use-libraries";
import { getLibraryById } from "@/services/LibraryService";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const LibrariesSection = () => {
  const navigate = useNavigate();
  const { libraries, loading, error, update, remove } = useLibraries();
  const [showLibraries, setShowLibraries] = useState(true);
  const [currentLibrary, setCurrentLibrary] = useState<Library | null>(null);
  const [deleteLibraryDialogOpen, setDeleteLibraryDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const toggleLibrariesSection = () => {
    setShowLibraries(!showLibraries);
  };

  const openNewLibraryDialog = () => {
    navigate("/instructor/libraries/create");
  };

  const openLibraryDetails = async (library: Library, editing: boolean) => {
    try {
      const full = await getLibraryById(library.libraryId);
      setCurrentLibrary(full);
      setIsEditing(editing);
      setDialogOpen(true);
    } catch (error) {
      console.error("Error fetching library details:", error);
      toast.error("Failed to load library details");
    }
  };

  const handleViewLibrary = (library: Library) => {
    openLibraryDetails(library, false);
  };

  const handleEditLibrary = (library: Library) => {
    openLibraryDetails(library, true);
  };

  const confirmDeleteLibrary = (library: Library, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentLibrary(library);
    setDeleteLibraryDialogOpen(true);
  };

  const handleSaveLibrary = async (editedLibrary: Library) => {
    try {
      await update(editedLibrary);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error updating library:", error);
    }
  };

  const handleDeleteLibrary = async () => {
    try {
      if (currentLibrary?.libraryId) {
        await remove(currentLibrary.libraryId);
      }
      setDeleteLibraryDialogOpen(false);
    } catch (error) {
      console.error("Error deleting library:", error);
    }
  };

  return (
    <div className="bg-background text-foreground rounded-lg border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <LibraryIcon size={20} />
            Libraries
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLibrariesSection}
            aria-label={showLibraries ? "Hide libraries" : "Show libraries"}
          >
            {showLibraries ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
        <Button className="gap-2" onClick={() => openNewLibraryDialog()}>
          <Plus size={16} />
          Create Library
        </Button>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-center text-red-500 py-4">{error}</div>}

      {showLibraries && libraries.length > 0 && (
        <LibraryList
          libraries={libraries}
          onView={handleViewLibrary}
          onEdit={(library, e) => {
            e.stopPropagation();
            handleEditLibrary(library);
          }}
          onDelete={confirmDeleteLibrary}
        />
      )}

      {showLibraries && libraries.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border rounded-lg bg-background">
          <div className="bg-primary/10 rounded-full p-3 inline-flex mb-4">
            <LibraryIcon className="text-primary" size={24} />
          </div>
          <p className="text-muted-foreground mb-4">No libraries found</p>
          <Button onClick={() => openNewLibraryDialog()}>
            Create Your First Library
          </Button>
        </div>
      )}

      <LibraryDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        library={currentLibrary}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onEdit={handleSaveLibrary}
        onClose={() => setDialogOpen(false)}
        onDelete={confirmDeleteLibrary}
      />

      <ConfirmDialog
        open={deleteLibraryDialogOpen}
        title="Confirm Library Deletion"
        description={`Are you sure you want to delete the library "${currentLibrary?.name}"? Any assignment linking it will lose access to its code. This action cannot be undone.`}
        onCancel={() => setDeleteLibraryDialogOpen(false)}
        onConfirm={handleDeleteLibrary}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default LibrariesSection;
