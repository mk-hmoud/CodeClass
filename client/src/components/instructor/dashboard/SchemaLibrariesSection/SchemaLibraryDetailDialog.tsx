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
import ConfirmDialog from "@/components/ui/confirm-dialog";
import AssignmentCodeEditor from "@/components/editors/AssignmentCodeEditor";
import { SchemaLibrary } from "@/types/SchemaLibrary";

interface SchemaLibraryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schemaLibrary: SchemaLibrary | null;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onEdit: (schemaLibrary: SchemaLibrary) => void;
  onDelete: (schemaLibrary: SchemaLibrary, e: React.MouseEvent) => void;
  onClose: () => void;
}

const SchemaLibraryDetailDialog = ({
  open,
  onOpenChange,
  schemaLibrary,
  isEditing,
  setIsEditing,
  onEdit,
  onDelete,
  onClose,
}: SchemaLibraryDetailDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [setupSql, setSetupSql] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    setName(schemaLibrary?.name ?? "");
    setDescription(schemaLibrary?.description ?? "");
    setSetupSql(schemaLibrary?.setupSql ?? "");
  }, [schemaLibrary]);

  const handleSaveChanges = () => {
    setShowSaveConfirm(true);
  };

  const confirmSaveChanges = () => {
    if (!schemaLibrary) return;
    onEdit({ ...schemaLibrary, name, description, setupSql });
    setIsEditing(false);
    setShowSaveConfirm(false);
  };

  const handleCancelSave = () => {
    setShowSaveConfirm(false);
  };

  if (!schemaLibrary) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>
              {isEditing ? "Edit Schema Library" : schemaLibrary.name}
            </DialogTitle>
            {!isEditing && (
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Edit Schema Library"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={20} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive"
                  aria-label="Delete Schema Library"
                  onClick={(e) => onDelete(schemaLibrary, e)}
                >
                  <Trash size={20} />
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="schema-library-name">
                Name <span className="text-destructive">*</span>
              </Label>
              {isEditing ? (
                <Input
                  id="schema-library-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2"
                />
              ) : (
                <div className="mt-2">{name}</div>
              )}
            </div>

            <div>
              <Label htmlFor="schema-library-description">Description</Label>
              {isEditing ? (
                <Textarea
                  id="schema-library-description"
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
              <Label className="mb-2 block">Setup SQL</Label>
              {isEditing ? (
                <AssignmentCodeEditor
                  language="sql"
                  value={setupSql}
                  onChange={setSetupSql}
                />
              ) : (
                <pre className="mt-1 text-sm bg-background p-4 rounded-md whitespace-pre-wrap">
                  {setupSql}
                </pre>
              )}
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
        description="This action will update the schema library. Any test case referencing it will use the new setup SQL immediately. Do you want to continue?"
        onCancel={handleCancelSave}
        onConfirm={confirmSaveChanges}
        confirmLabel="Continue"
        cancelLabel="Cancel"
      />
    </>
  );
};

export default SchemaLibraryDetailDialog;
