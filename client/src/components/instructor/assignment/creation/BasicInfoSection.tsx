import React, { useState, useEffect } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Wand2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "@/lib/assignmentUtils";
import { getGroups } from "@/services/GroupService";
import { Problem } from "@/types/Problem";
import { LabGroup } from "@/types/Group";

export interface TestCaseOverrideDraft {
  testCaseId: number;
  input?: string;
  expectedOutput?: string;
}

interface BasicInfoSectionProps {
  form: UseFormReturn<FormValues>;
  classroomId: number;
  /** First problem in the set; drives single-problem conveniences below. */
  primaryProblem: Problem | null;
  /** True when the assignment has exactly one problem. */
  singleProblem: boolean;
  onTestCaseOverridesChange?: (overrides: TestCaseOverrideDraft[]) => void;
}

const NO_GROUP_VALUE = "none";

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  form,
  classroomId,
  primaryProblem,
  singleProblem,
  onTestCaseOverridesChange,
}) => {
  const [groups, setGroups] = useState<LabGroup[]>([]);
  const [overrides, setOverrides] = useState<Record<number, { input: string; expectedOutput: string }>>({});

  useEffect(() => {
    if (classroomId) getGroups(classroomId).then(setGroups).catch((e) => console.error("Error fetching groups:", e));
  }, [classroomId]);

  const watchGroupId = form.watch("groupId");
  const watchGradingMethod = form.watch("grading_method");
  const watchDueDate = form.watch("due_date");
  const watchGradeReleaseMode = form.watch("grade_release_mode");

  // Image-output problems can't be auto-diffed; lock grading to Manual when the
  // (single) problem produces an image. Only meaningful for single-problem.
  const imageLocked = singleProblem && primaryProblem?.outputType === "image";
  useEffect(() => {
    if (imageLocked) form.setValue("grading_method", "Manual");
  }, [imageLocked]);

  // Grade release only applies to auto-graded assignments.
  useEffect(() => {
    if (watchGradingMethod === "Manual") form.setValue("grade_release_mode", "immediate");
  }, [watchGradingMethod]);

  useEffect(() => { setOverrides({}); }, [watchGroupId, primaryProblem?.problemId]);

  useEffect(() => {
    if (!onTestCaseOverridesChange) return;
    const drafts: TestCaseOverrideDraft[] = Object.entries(overrides)
      .filter(([, v]) => v.input.trim() || v.expectedOutput.trim())
      .map(([testCaseId, v]) => ({
        testCaseId: Number(testCaseId),
        input: v.input.trim() || undefined,
        expectedOutput: v.expectedOutput.trim() || undefined,
      }));
    onTestCaseOverridesChange(drafts);
  }, [overrides, onTestCaseOverridesChange]);

  const handleOverrideChange = (testCaseId: number, field: "input" | "expectedOutput", value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [testCaseId]: {
        input: prev[testCaseId]?.input ?? "",
        expectedOutput: prev[testCaseId]?.expectedOutput ?? "",
        [field]: value,
      },
    }));
  };

  const autofillFromProblem = () => {
    if (!primaryProblem) return;
    form.setValue("title", primaryProblem.title);
    form.setValue("description", primaryProblem.description);
  };

  const showOverrides = singleProblem && watchGroupId && (primaryProblem?.testCases?.length ?? 0) > 0;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Assignment Details</h2>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel>
                  Title {!singleProblem && <span className="text-destructive">*</span>}
                </FormLabel>
                {singleProblem && primaryProblem && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={autofillFromProblem}>
                    <Wand2 size={13} /> Autofill from problem
                  </Button>
                )}
              </div>
              <FormControl>
                <Input
                  placeholder={singleProblem ? "Assignment title (optional — defaults to the problem's)" : "Assignment title"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={singleProblem ? "Assignment description (optional — defaults to the problem's)" : "Assignment description (shown above the problem list)"}
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="difficulty_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty Level <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grading_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grading Method <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={imageLocked}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select grading method" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Manual">Manual Grading</SelectItem>
                    <SelectItem value="Automatic">Automatic Grading</SelectItem>
                    <SelectItem value="Hybrid">Hybrid Grading</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {imageLocked
                    ? "This problem produces an image, so there's nothing to auto-diff — grading is locked to Manual."
                    : "How student submissions are evaluated."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {watchGradingMethod !== "Manual" && (
          <FormField
            control={form.control}
            name="grade_release_mode"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Grade Release</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><Info size={16} className="text-info" /></TooltipTrigger>
                      <TooltipContent>
                        <p>When students can see their auto-computed score. Test pass/fail is always shown immediately.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select when grades are released" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="immediate">Immediately after grading</SelectItem>
                    <SelectItem value="on_deadline">After the due date</SelectItem>
                    <SelectItem value="manual">Manually (I'll release them myself)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {watchGradeReleaseMode === "on_deadline" && !watchDueDate
                    ? "No due date is set yet — without one, grades will be visible immediately."
                    : watchGradeReleaseMode === "manual"
                    ? "Scores stay hidden until you click \"Release Grades\" on the assignment page."
                    : watchGradeReleaseMode === "on_deadline"
                    ? "Scores become visible automatically once the due date passes."
                    : "Scores are visible to students as soon as grading finishes."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {groups.length > 0 && (
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === NO_GROUP_VALUE ? "" : value)}
                  defaultValue={field.value || NO_GROUP_VALUE}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Whole classroom" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_GROUP_VALUE}>Whole classroom</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.groupId} value={String(group.groupId)}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Optional: restrict this assignment to one lab group{singleProblem ? ", and optionally tweak its test cases below." : "."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showOverrides && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Test Case Overrides</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Leave a field blank to use the problem's original value for this group.</p>
            </div>
            {primaryProblem!.testCases.map((tc) => (
              <div key={tc.testCaseId} className="border border-border rounded-md p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <FormLabel className="text-xs">Input override (original: {tc.input || "(none)"})</FormLabel>
                  <Textarea
                    className="mt-1 min-h-[60px]"
                    value={overrides[tc.testCaseId!]?.input ?? ""}
                    onChange={(e) => handleOverrideChange(tc.testCaseId!, "input", e.target.value)}
                    placeholder="Leave blank to keep original"
                  />
                </div>
                <div>
                  <FormLabel className="text-xs">Expected output override (original: {tc.expectedOutput})</FormLabel>
                  <Textarea
                    className="mt-1 min-h-[60px]"
                    value={overrides[tc.testCaseId!]?.expectedOutput ?? ""}
                    onChange={(e) => handleOverrideChange(tc.testCaseId!, "expectedOutput", e.target.value)}
                    placeholder="Leave blank to keep original"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicInfoSection;
