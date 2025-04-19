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
import { Problem } from "@/types/Problem";

interface BasicInfoSectionProps {
  form: UseFormReturn<FormValues>;
  // Callback to pass the currently selected problem upward.
  onSelectedProblemChange?: (problem: Problem | null) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  form,
  onSelectedProblemChange,
}) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  // Local state for the selected problem.
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

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

  // Watch the form field for problemId changes.
  const watchProblemId = form.watch("problemId");

  useEffect(() => {
    if (watchProblemId) {
      const found =
        problems.find((p) => String(p.problemId) === watchProblemId) || null;
      setSelectedProblem(found);
      if (onSelectedProblemChange) {
        onSelectedProblemChange(found);
      }
    } else {
      setSelectedProblem(null);
      if (onSelectedProblemChange) {
        onSelectedProblemChange(null);
      }
    }
  }, [watchProblemId, problems, onSelectedProblemChange]);

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
        {selectedProblem && (
          <div className="bg-[#0d1224] p-4 rounded-md text-sm">
            <h3 className="font-medium mb-1">Problem Description</h3>
            <p className="text-gray-400">{selectedProblem.description}</p>
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
        {/* Additional form fields can be added here */}
      </CardContent>
    </Card>
  );
};

export default BasicInfoSection;
