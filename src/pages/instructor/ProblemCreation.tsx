import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { TestCase } from "../../types/TestCase";
import { createProblem } from "@/services/ProblemService";

const categories = [
  "Fundamentals",
  "Algorithms",
  "Bug fixes",
  "Refactoring",
  "Puzzles",
];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  prerequisites: z.string().optional(),
  learning_outcomes: z.string().optional(),
  tags: z.string().optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z
          .string()
          .min(1, "Expected output is required for each test case"),
        isPublic: z.boolean().default(false),
      })
    )
    .min(1, "At least one test case is required"),
});

type FormValues = z.infer<typeof formSchema>;

const ProblemCreation = () => {
  const navigate = useNavigate();
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "", isPublic: false },
  ]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Fundamentals",
      prerequisites: "",
      learning_outcomes: "",
      tags: "",
      testCases: [{ input: "", expectedOutput: "", isPublic: false }],
    },
  });

  const onSubmit = async (data: FormValues) => {
    const emptyOutputs = data.testCases.filter(
      (tc) => !tc.expectedOutput.trim()
    );
    if (emptyOutputs.length > 0) {
      toast.error("Please provide expected output for all test cases");
      return;
    }

    try {
      await createProblem(data);
      toast.success(`Problem "${data.title}" created successfully`);
      navigate("/instructor/dashboard");
    } catch (error) {
      console.error("Error creating problem:", error);
      toast.error("Error creating problem");
    }
  };

  const addTestCase = () => {
    const newTestCase = { input: "", expectedOutput: "", isPublic: false };
    setTestCases([...testCases, newTestCase]);
    form.setValue("testCases", [...form.getValues().testCases, newTestCase]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length === 1) {
      toast.error("At least one test case is required");
      return;
    }
    const newTestCases = [...testCases];
    newTestCases.splice(index, 1);
    setTestCases(newTestCases);

    const formTestCases = [...form.getValues().testCases];
    formTestCases.splice(index, 1);
    form.setValue("testCases", formTestCases);
  };

  const updateTestCase = (
    index: number,
    field: keyof TestCase,
    value: string | boolean
  ) => {
    const updatedTestCases = [...testCases];
    updatedTestCases[index] = { ...updatedTestCases[index], [field]: value };
    setTestCases(updatedTestCases);

    const updatedFormTestCases = [...form.getValues().testCases];
    updatedFormTestCases[index] = {
      ...updatedFormTestCases[index],
      [field]: value,
    };
    form.setValue("testCases", updatedFormTestCases);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button
          variant="outline"
          className="flex items-center gap-2 mb-4"
          onClick={() => navigate("/instructor/dashboard")}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Create New Problem</h1>
        <p className="text-gray-400 mt-2">
          Create a new coding problem for your students to solve.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Binary Search Implementation"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the category that best fits this problem.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. sorting, recursion, arrays"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of tags.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="prerequisites"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prerequisites</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Knowledge or skills required to solve this problem"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="learning_outcomes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Learning Outcomes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What students will learn by solving this problem"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed problem description with examples"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>
                Test Cases <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTestCase}
                className="flex items-center gap-1"
              >
                <Plus size={14} />
                Add Test Case
              </Button>
            </div>

            {testCases.map((testCase, index) => (
              <Card key={index} className="bg-[#0d1224] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-semibold text-gray-400">
                      Test Case #{index + 1}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestCase(index)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`input-${index}`}>Input</Label>
                      <Textarea
                        id={`input-${index}`}
                        value={testCase.input}
                        onChange={(e) =>
                          updateTestCase(index, "input", e.target.value)
                        }
                        placeholder="Input for this test case"
                        className="mt-1 min-h-[80px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`expected-${index}`}>
                        Expected Output <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`expected-${index}`}
                        value={testCase.expectedOutput}
                        onChange={(e) =>
                          updateTestCase(
                            index,
                            "expectedOutput",
                            e.target.value
                          )
                        }
                        placeholder="Expected output for this test case"
                        className="mt-1 min-h-[80px]"
                      />
                      {!testCase.expectedOutput && (
                        <p className="text-red-500 text-sm mt-1">
                          Expected output is required
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Checkbox
                      id={`public-${index}`}
                      checked={testCase.isPublic}
                      onCheckedChange={(checked) =>
                        updateTestCase(index, "isPublic", checked === true)
                      }
                    />
                    <Label
                      htmlFor={`public-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      Make this test case visible to students
                    </Label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/instructor/dashboard")}
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Save size={16} />
              Create Problem
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProblemCreation;
