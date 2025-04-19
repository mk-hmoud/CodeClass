import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { FormValues } from "@/lib/assignmentUtils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormValues | null;
  onConfirm: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  formData,
  onConfirm,
}) => {
  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Assignment Creation</DialogTitle>
          <DialogDescription>
            Please review the assignment details before creating.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Problem:</div>

              <div className="text-gray-400">Title:</div>
              <div>{formData.title || "Using problem title"}</div>

              <div className="text-gray-400">Description:</div>
              <div>
                {formData.description
                  ? "Custom description"
                  : "Using problem description"}
              </div>

              <div className="text-gray-400">Difficulty:</div>
              <div>{formData.difficulty_level}</div>

              <div className="text-gray-400">Points:</div>
              <div>{formData.points}</div>

              <div className="text-gray-400">Grading Method:</div>
              <div>{formData.grading_method}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Submission Settings</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Limit Submission Attempts:</div>
              <div>{formData.enable_submission_attempts ? "Yes" : "No"}</div>

              {formData.enable_submission_attempts && (
                <>
                  <div className="text-gray-400">Max Attempts:</div>
                  <div>{formData.submission_attempts}</div>
                </>
              )}

              <div className="text-gray-400">Plagiarism Detection:</div>
              <div>
                {formData.plagiarism_detection ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Schedule</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Publish:</div>
              <div>
                {formData.publish_immediately
                  ? "Immediately"
                  : `${format(formData.publish_date, "PPP")} at ${
                      formData.publish_time
                    }`}
              </div>

              <div className="text-gray-400">Due Date:</div>
              <div>
                {format(formData.due_date, "PPP")} at {formData.due_time}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Programming Languages</h3>
            <div className="flex flex-wrap gap-2">
              {formData.programming_languages.map((lang) => (
                <span
                  key={lang}
                  className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Edit
          </Button>
          <Button onClick={onConfirm}>Confirm & Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
