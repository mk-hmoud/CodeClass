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
  problemTitle?: string | null;
  problems?: { title: string; points: number }[];
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  formData,
  onConfirm,
  problemTitle,
  problems = [],
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
            <h3 className="font-semibold">
              Problems <span className="text-muted-foreground font-normal">({problems.length}, {problems.reduce((s, p) => s + p.points, 0)} pts total)</span>
            </h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              {problems.map((p, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{p.title}</span>
                  <span className="text-muted-foreground shrink-0">{p.points} pts</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Assignment</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Title:</div>
              <div>{formData.title || (problemTitle ? `Using "${problemTitle}"` : "—")}</div>

              <div className="text-muted-foreground">Description:</div>
              <div>{formData.description ? "Custom description" : "Using problem description"}</div>

              <div className="text-muted-foreground">Difficulty:</div>
              <div>{formData.difficulty_level}</div>

              <div className="text-muted-foreground">Grading Method:</div>
              <div>{formData.grading_method}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Submission Settings</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Limit Submission Attempts:</div>
              <div>{formData.enable_max_submissions ? "Yes" : "No"}</div>

              {formData.enable_max_submissions && (
                <>
                  <div className="text-muted-foreground">Max Attempts:</div>
                  <div>{formData.max_submissions}</div>
                </>
              )}

              <div className="text-muted-foreground">Plagiarism Detection:</div>
              <div>
                {formData.plagiarism_detection ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Schedule</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Publish:</div>
              <div>
                {formData.publish_immediately
                  ? "Immediately"
                  : `${format(formData.publish_date, "PPP")} at ${
                      formData.publish_time
                    }`}
              </div>

              <div className="text-muted-foreground">Due Date:</div>
              <div>
                {format(formData.due_date, "PPP")} at {formData.due_time}
              </div>
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
