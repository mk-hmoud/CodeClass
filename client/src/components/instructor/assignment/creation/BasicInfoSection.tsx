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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "@/lib/assignmentUtils";
import { getProblems } from "@/services/ProblemService";
import { getLibraries } from "@/services/LibraryService";
import { getGroups } from "@/services/GroupService";
import { Problem } from "@/types/Problem";
import { Library } from "@/types/Library";
import { LabGroup } from "@/types/Group";

export interface TestCaseOverrideDraft {
  testCaseId: number;
  input?: string;
  expectedOutput?: string;
}

interface BasicInfoSectionProps {
  form: UseFormReturn<FormValues>;
  classroomId: number;
  onSelectedProblemChange?: (problem: Problem | null) => void;
  onTestCaseOverridesChange?: (overrides: TestCaseOverrideDraft[]) => void;
}

const NO_LIBRARY_VALUE = "none";
const NO_GROUP_VALUE = "none";

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  form,
  classroomId,
  onSelectedProblemChange,
  onTestCaseOverridesChange,
}) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [groups, setGroups] = useState<LabGroup[]>([]);
  const [overrides, setOverrides] = useState<Record<number, { input: string; expectedOutput: string }>>({});

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const fetchedProblems = await getProblems();
        setProblems(fetchedProblems);
      } catch (error) {
        console.error("Error fetching problems:", error);
      }
    };
    fetchProblems();
  }, []);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const fetchedLibraries = await getLibraries();
        setLibraries(fetchedLibraries);
      } catch (error) {
        console.error("Error fetching libraries:", error);
      }
    };
    fetchLibraries();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const fetchedGroups = await getGroups(classroomId);
        setGroups(fetchedGroups);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    if (classroomId) fetchGroups();
  }, [classroomId]);

  const watchProblemId = form.watch("problemId");
  const watchGroupId = form.watch("groupId");

  useEffect(() => {
    if (watchProblemId) {
      const found =
        problems.find((p) => String(p.problemId) === watchProblemId) || null;
      setSelectedProblem(found);
      onSelectedProblemChange?.(found);
    } else {
      setSelectedProblem(null);
      onSelectedProblemChange?.(null);
    }
    setOverrides({});
  }, [watchProblemId, problems, onSelectedProblemChange]);

  useEffect(() => {
    setOverrides({});
  }, [watchGroupId]);

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

  const handleOverrideChange = (
    testCaseId: number,
    field: "input" | "expectedOutput",
    value: string
  ) => {
    setOverrides((prev) => ({
      ...prev,
      [testCaseId]: {
        input: prev[testCaseId]?.input ?? "",
        expectedOutput: prev[testCaseId]?.expectedOutput ?? "",
        [field]: value,
      },
    }));
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <FormField
          control={form.control}
          name="problemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Problem <span className="text-red-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a problem" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {problems.map((problem) => (
                    <SelectItem
                      key={problem.problemId}
                      value={String(problem.problemId)}
                    >
                      {problem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the problem to base this assignment on.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="libraryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Library</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(value === NO_LIBRARY_VALUE ? "" : value)
                }
                defaultValue={field.value || NO_LIBRARY_VALUE}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No library" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_LIBRARY_VALUE}>No library</SelectItem>
                  {libraries.map((library) => (
                    <SelectItem
                      key={library.libraryId}
                      value={String(library.libraryId)}
                    >
                      {library.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Optional: make this instructor library's helper code available
                to student submissions when grading this assignment.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {groups.length > 0 && (
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === NO_GROUP_VALUE ? "" : value)
                  }
                  defaultValue={field.value || NO_GROUP_VALUE}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Whole classroom" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_GROUP_VALUE}>Whole classroom</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.groupId} value={String(group.groupId)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Optional: restrict this assignment to one lab group, and
                  optionally tweak its test cases below so groups in
                  different time slots can't share answers.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchGroupId && selectedProblem && selectedProblem.testCases.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Test Case Overrides</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leave a field blank to use the problem's original value for this group.
              </p>
            </div>
            {selectedProblem.testCases.map((tc) => (
              <div key={tc.testCaseId} className="border border-border rounded-md p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <FormLabel className="text-xs">
                    Input override (original: {tc.input || "(none)"})
                  </FormLabel>
                  <Textarea
                    className="mt-1 min-h-[60px]"
                    value={overrides[tc.testCaseId]?.input ?? ""}
                    onChange={(e) => handleOverrideChange(tc.testCaseId, "input", e.target.value)}
                    placeholder="Leave blank to keep original"
                  />
                </div>
                <div>
                  <FormLabel className="text-xs">
                    Expected output override (original: {tc.expectedOutput})
                  </FormLabel>
                  <Textarea
                    className="mt-1 min-h-[60px]"
                    value={overrides[tc.testCaseId]?.expectedOutput ?? ""}
                    onChange={(e) => handleOverrideChange(tc.testCaseId, "expectedOutput", e.target.value)}
                    placeholder="Leave blank to keep original"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedProblem && (
          <div className="bg-card p-4 rounded-md text-sm">
            <h3 className="font-medium mb-1">Problem Description</h3>
            <p className="text-muted-foreground">
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap break-words">
                  {selectedProblem.description}
                </pre>
              </div>
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Title</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className="text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Leave blank to use problem title</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input placeholder="Assignment title (optional)" {...field} />
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
              <div className="flex items-center gap-2">
                <FormLabel>Description</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className="text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Leave blank to use problem description</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Assignment description (optional)"
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
                <div className="flex items-center gap-2">
                  <FormLabel>
                    Difficulty Level <span className="text-red-500">*</span>
                  </FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={16} className="text-blue-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Set the difficulty level for this assignment</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
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
            name="points"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>
                    Points <span className="text-red-500">*</span>
                  </FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={16} className="text-blue-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The number of points this assignment is worth</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="grading_method"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>
                  Grading Method <span className="text-red-500">*</span>
                </FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className="text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How this assignment will be graded</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grading method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Manual">Manual Grading</SelectItem>
                  <SelectItem value="Automatic">Automatic Grading</SelectItem>
                  <SelectItem value="Hybrid">Hybrid Grading</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose how student submissions will be evaluated.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default BasicInfoSection;
