import React, { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Problem } from "../../types/Problem";
import { TestCase } from "../../types/TestCase";

interface ProblemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProblem: Problem | null;
  onEdit: (problem: Problem) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  "Fundamentals",
  "Algorithms",
  "Bug fixes",
  "Refactoring",
  "Puzzles",
];

const ProblemDetailDialog = ({
  open,
  onOpenChange,
  currentProblem,
  onEdit,
  onClose,
}: ProblemDetailDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProblem, setEditedProblem] = useState<Problem | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    if (currentProblem) {
      setEditedProblem({
        ...currentProblem,
        category: currentProblem.category,
        prerequisites: currentProblem.prerequisites,
        learning_outcomes: currentProblem.learning_outcomes,
        test_cases: currentProblem.test_cases,
      });
      setTags(
        currentProblem.tags
          ? currentProblem.tags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t)
          : []
      );
    }
    setIsEditing(false);
  }, [currentProblem, open]);

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
    if (editedProblem?.test_cases) {
      const updatedTestCases = [...editedProblem.test_cases];
      updatedTestCases[index] = {
        ...updatedTestCases[index],
        [field]: value,
      };
      handleChange("test_cases", updatedTestCases);
    }
  };

  const handleAddTestCase = () => {
    if (editedProblem?.test_cases) {
      const newTestCase: TestCase = {
        testCaseId: Date.now(),
        input: "",
        expectedOutput: "",
        isPublic: true,
      };
      handleChange("test_cases", [...editedProblem.test_cases, newTestCase]);
    }
  };

  const handleRemoveTestCase = (index: number) => {
    if (editedProblem?.test_cases) {
      const updatedTestCases = [...editedProblem.test_cases];
      updatedTestCases.splice(index, 1);
      handleChange("test_cases", updatedTestCases);
    }
  };

  if (!currentProblem || !editedProblem) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Problem" : currentProblem.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="problem-title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="problem-title"
                    value={editedProblem.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="problem-category">Category</Label>
                  <Select
                    value={editedProblem.category}
                    onValueChange={(value) => handleChange("category", value)}
                  >
                    <SelectTrigger id="problem-category" className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="problem-tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-blue-900/30 text-blue-400 border-blue-700 flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </Badge>
                    ))}
                  </div>
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
                </div>

                <div>
                  <Label htmlFor="problem-description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="problem-description"
                    value={editedProblem.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    className="mt-2 min-h-[150px]"
                  />
                </div>

                <div>
                  <Label htmlFor="problem-prerequisites">Prerequisites</Label>
                  <Textarea
                    id="problem-prerequisites"
                    value={editedProblem.prerequisites}
                    onChange={(e) =>
                      handleChange("prerequisites", e.target.value)
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="problem-outcomes">Learning Outcomes</Label>
                  <Textarea
                    id="problem-outcomes"
                    value={editedProblem.learning_outcomes}
                    onChange={(e) =>
                      handleChange("learning_outcomes", e.target.value)
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="flex items-center justify-between">
                    <span>Test Cases</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTestCase}
                      className="flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Test Case
                    </Button>
                  </Label>

                  <div className="space-y-4 mt-2">
                    {editedProblem.test_cases?.map((testCase, index) => (
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
                                Public
                              </label>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTestCase(index)}
                            className="h-7 w-7 p-0 text-red-500"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label
                              className="text-xs"
                              htmlFor={`test-input-${index}`}
                            >
                              Input
                            </Label>
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
                          </div>
                          <div>
                            <Label
                              className="text-xs"
                              htmlFor={`test-output-${index}`}
                            >
                              Expected Output
                            </Label>
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Category
                    </h3>
                    <p>{editedProblem.category || "Algorithm"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Tags</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tags.map((tag, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-blue-900/30 text-blue-400 border-blue-700"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    Description
                  </h3>
                  <div className="mt-1 bg-[#0c121f] p-4 rounded-md">
                    <p className="whitespace-pre-line">
                      {editedProblem.description}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    Prerequisites
                  </h3>
                  <p className="text-gray-300">{editedProblem.prerequisites}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    Learning Outcomes
                  </h3>
                  <p className="text-gray-300">
                    {editedProblem.learning_outcomes}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    Test Cases
                  </h3>
                  <div className="mt-1 space-y-2">
                    {editedProblem.test_cases?.map((testCase, index) => (
                      <div
                        key={testCase.testCaseId}
                        className="bg-[#0c121f] p-3 rounded-md"
                      >
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">
                            Test Case #{index + 1}
                          </span>
                          <span
                            className={`text-xs ${
                              testCase.isPublic
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {testCase.isPublic ? "Public" : "Private"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <h4 className="text-xs text-gray-400">Input</h4>
                            <pre className="mt-1 text-sm bg-[#0a0d17] p-2 rounded-md">
                              {testCase.input}
                            </pre>
                          </div>
                          <div>
                            <h4 className="text-xs text-gray-400">
                              Expected Output
                            </h4>
                            <pre className="mt-1 text-sm bg-[#0a0d17] p-2 rounded-md">
                              {testCase.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={onClose}>
              {isEditing ? "Cancel" : "Close"}
            </Button>
            <div className="flex gap-2">
              {isEditing ? (
                <Button onClick={handleSaveChanges}>Save Changes</Button>
              ) : (
                <Button onClick={handleEditToggle}>
                  <Edit size={16} className="mr-2" />
                  Edit Problem
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will update the problem details. Do you want to
              continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveChanges}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProblemDetailDialog;
