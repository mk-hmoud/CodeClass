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
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Trash, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Problem } from "@/types/Problem";
import { TestCase } from "@/types/TestCase";
import { PROBLEM_CATEGORY_OPTIONS } from "@/constants/problem";

interface ProblemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problem: Problem | null;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem, e: React.MouseEvent) => void;
  onClose: () => void;
}

const ProblemDetailDialog = ({
  open,
  onOpenChange,
  problem,
  isEditing,
  setIsEditing,
  onEdit,
  onDelete,
  onClose,
}: ProblemDetailDialogProps) => {
  const [editedProblem, setEditedProblem] = useState<Problem | null>(problem);
  const [tags, setTags] = useState<string[]>(
    problem?.tags
      ? problem.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : []
  );
  const [newTag, setNewTag] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Sync editedProblem and tags when problem changes
  useEffect(() => {
    setEditedProblem(problem);
    setTags(
      problem?.tags
        ? problem.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t)
        : []
    );
  }, [problem]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = () => {
    setShowSaveConfirm(true);
  };

  const confirmSaveChanges = () => {
    if (editedProblem) {
      const updatedProblem = {
        ...editedProblem,
        tags: tags.join(", "),
      };
      onEdit(updatedProblem);
      setEditedProblem(updatedProblem);
      setIsEditing(false);
      setShowSaveConfirm(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveConfirm(false);
  };

  const handleChange = (field: keyof Problem, value: string | TestCase[]) => {
    if (editedProblem) {
      setEditedProblem({
        ...editedProblem,
        [field]: value,
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTestCaseChange = (
    index: number,
    field: keyof TestCase,
    value: any
  ) => {
    if (editedProblem?.testCases) {
      const updatedTestCases = [...editedProblem.testCases];
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        [field]: value,
      };
      handleChange("testCases", updatedTestCases);
    }
  };

  const handleAddTestCase = () => {
    if (editedProblem?.testCases) {
      const newTestCase: TestCase = {
        testCaseId: Date.now(),
        input: "",
        expectedOutput: "",
        isPublic: true,
      };
      handleChange("testCases", [...editedProblem.testCases, newTestCase]);
    }
  };

  const handleRemoveTestCase = (index: number) => {
    if (editedProblem?.testCases) {
      const updatedTestCases = [...editedProblem.testCases];
      updatedTestCases.splice(index, 1);
      handleChange("testCases", updatedTestCases);
    }
  };

  if (!problem || !editedProblem) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>
              {isEditing ? "Edit Problem" : problem.title}
            </DialogTitle>
            {!isEditing && (
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Edit Problem"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit size={20} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-red-500"
                  aria-label="Delete Problem"
                  onClick={(e) => onDelete(problem, e)}
                >
                  <Trash size={20} />
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="problem-title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  {isEditing ? (
                    <Input
                      id="problem-title"
                      value={editedProblem.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="mt-2"
                    />
                  ) : (
                    <div className="mt-2">{editedProblem.title}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor="problem-category">Category</Label>
                  {isEditing ? (
                    <Select
                      value={editedProblem.category}
                      onValueChange={(value) => handleChange("category", value)}
                    >
                      <SelectTrigger id="problem-category" className="mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROBLEM_CATEGORY_OPTIONS.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2">
                      {editedProblem.category || "Algorithm"}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="problem-tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-blue-900/30 text-blue-400 border-blue-700 flex items-center gap-1"
                      >
                        {tag}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-400"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag"
                        onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      />
                      <Button type="button" onClick={handleAddTag} size="sm">
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="problem-description">
                  Description <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <Textarea
                    id="problem-description"
                    value={editedProblem.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    className="mt-2 min-h-[150px]"
                  />
                ) : (
                  <div className="mt-1 bg-[#0c121f] p-4 rounded-md">
                    <p className="whitespace-pre-line">
                      {editedProblem.description}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="problem-prerequisites">Prerequisites</Label>
                {isEditing ? (
                  <Textarea
                    id="problem-prerequisites"
                    value={editedProblem.prerequisites}
                    onChange={(e) =>
                      handleChange("prerequisites", e.target.value)
                    }
                    className="mt-2"
                  />
                ) : (
                  <div className="mt-1 bg-[#0c121f] p-4 rounded-md">
                    <p className="whitespace-pre-line">
                      {editedProblem.prerequisites}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="problem-outcomes">Learning Outcomes</Label>
                {isEditing ? (
                  <Textarea
                    id="problem-outcomes"
                    value={editedProblem.learning_outcomes}
                    onChange={(e) =>
                      handleChange("learning_outcomes", e.target.value)
                    }
                    className="mt-2"
                  />
                ) : (
                  <div className="mt-1 bg-[#0c121f] p-4 rounded-md">
                    <p className="whitespace-pre-line">
                      {editedProblem.learning_outcomes}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="flex items-center justify-between">
                  <span>Test Cases</span>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTestCase}
                      className="flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Test Case
                    </Button>
                  )}
                </Label>
                <div className="space-y-4 mt-2">
                  {editedProblem.testCases?.map((testCase, index) => (
                    <div
                      key={testCase.testCaseId}
                      className="border border-gray-700 rounded-md p-3"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            Test Case #{index + 1}
                          </span>
                          <div className="flex items-center">
                            <label className="text-xs flex items-center gap-1">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  checked={testCase.isPublic}
                                  onChange={(e) =>
                                    handleTestCaseChange(
                                      index,
                                      "isPublic",
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-gray-700"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={testCase.isPublic}
                                  readOnly
                                  tabIndex={-1}
                                  className="rounded border-gray-700"
                                  aria-label="Test case public/private"
                                />
                              )}
                              Public
                            </label>
                          </div>
                        </div>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTestCase(index)}
                            className="h-7 w-7 p-0 text-red-500"
                          >
                            <Trash size={14} />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label
                            className="text-xs"
                            htmlFor={`test-input-${index}`}
                          >
                            Input
                          </Label>
                          {isEditing ? (
                            <Textarea
                              id={`test-input-${index}`}
                              value={testCase.input}
                              onChange={(e) =>
                                handleTestCaseChange(
                                  index,
                                  "input",
                                  e.target.value
                                )
                              }
                              className="mt-1 min-h-[80px] bg-[#0a0d17]"
                            />
                          ) : (
                            <pre className="mt-1 text-sm bg-[#0a0d17] p-2 rounded-md">
                              {testCase.input}
                            </pre>
                          )}
                        </div>
                        <div>
                          <Label
                            className="text-xs"
                            htmlFor={`test-output-${index}`}
                          >
                            Expected Output
                          </Label>
                          {isEditing ? (
                            <Textarea
                              id={`test-output-${index}`}
                              value={testCase.expectedOutput}
                              onChange={(e) =>
                                handleTestCaseChange(
                                  index,
                                  "expectedOutput",
                                  e.target.value
                                )
                              }
                              className="mt-1 min-h-[80px] bg-[#0a0d17]"
                            />
                          ) : (
                            <pre className="mt-1 text-sm bg-[#0a0d17] p-2 rounded-md">
                              {testCase.expectedOutput}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
        description="This action will update the problem details. Do you want to continue?"
        onCancel={handleCancelSave}
        onConfirm={confirmSaveChanges}
        confirmLabel="Continue"
        cancelLabel="Cancel"
      />
    </>
  );
};

export default ProblemDetailDialog;
