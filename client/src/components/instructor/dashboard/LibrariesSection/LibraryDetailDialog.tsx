import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Edit, Trash } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import AssignmentCodeEditor from "@/components/editors/AssignmentCodeEditor";
import { getLanguages } from "@/services/LanguageService";
import { Library, LibraryFile } from "@/types/Library";

interface LibraryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: Library | null;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onEdit: (library: Library) => void;
  onDelete: (library: Library, e: React.MouseEvent) => void;
  onClose: () => void;
}

const LibraryDetailDialog = ({
  open,
  onOpenChange,
  library,
  isEditing,
  setIsEditing,
  onEdit,
  onDelete,
  onClose,
}: LibraryDetailDialogProps) => {
  const { data: languages } = useQuery({
    queryKey: ["programmingLanguages"],
    queryFn: getLanguages,
    staleTime: 5 * 60 * 1000,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contentByLanguage, setContentByLanguage] = useState<
    Record<number, string>
  >({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    setName(library?.name ?? "");
    setDescription(library?.description ?? "");
    const map: Record<number, string> = {};
    (library?.files ?? []).forEach((f: LibraryFile) => {
      map[f.languageId] = f.content;
    });
    setContentByLanguage(map);
  }, [library]);

  const handleSaveChanges = () => {
    setShowSaveConfirm(true);
  };

  const confirmSaveChanges = () => {
    if (!library) return;
    const files: LibraryFile[] = Object.entries(contentByLanguage)
      .filter(([, content]) => content.trim().length > 0)
      .map(([languageId, content]) => ({
        languageId: Number(languageId),
        content,
      }));

    onEdit({ ...library, name, description, files });
    setIsEditing(false);
    setShowSaveConfirm(false);
  };

  const handleCancelSave = () => {
    setShowSaveConfirm(false);
  };

  if (!library) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>
              {isEditing ? "Edit Library" : library.name}
            </DialogTitle>
            {!isEditing && (
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Edit Library"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={20} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-red-500"
                  aria-label="Delete Library"
                  onClick={(e) => onDelete(library, e)}
                >
                  <Trash size={20} />
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="library-name">
                Name <span className="text-red-500">*</span>
              </Label>
              {isEditing ? (
                <Input
                  id="library-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2"
                />
              ) : (
                <div className="mt-2">{name}</div>
              )}
            </div>

            <div>
              <Label htmlFor="library-description">Description</Label>
              {isEditing ? (
                <Textarea
                  id="library-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-2 min-h-[80px]"
                />
              ) : (
                <div className="mt-1 bg-background p-4 rounded-md">
                  <p className="whitespace-pre-line">
                    {description || "No description"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Library Code</Label>
              <div className="space-y-4">
                {(languages || [])
                  .filter(
                    (lang) =>
                      isEditing || contentByLanguage[lang.language_id]
                  )
                  .map((lang) => (
                    <AssignmentCodeEditor
                      key={lang.language_id}
                      language={lang.name}
                      value={contentByLanguage[lang.language_id] ?? ""}
                      onChange={(value) =>
                        isEditing &&
                        setContentByLanguage((prev) => ({
                          ...prev,
                          [lang.language_id]: value ?? "",
                        }))
                      }
                    />
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {isEditing ? (
              <Button onClick={handleSaveChanges}>Save Changes</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showSaveConfirm}
        title="Are you sure?"
        description="This action will update the library details. Do you want to continue?"
        onCancel={handleCancelSave}
        onConfirm={confirmSaveChanges}
        confirmLabel="Continue"
        cancelLabel="Cancel"
      />
    </>
  );
};

export default LibraryDetailDialog;
