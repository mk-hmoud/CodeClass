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
  onSelectedProblemChange?: (problem: Problem | null) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  form,
  onSelectedProblemChange,
}) => {
  const [problems, setProblems] = useState<Problem[]>([]);
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

  const watchProblemId = form.watch("problemId");

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
