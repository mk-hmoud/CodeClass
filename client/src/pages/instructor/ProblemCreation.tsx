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
import { runCode, getRunStatus } from "@/services/JudgeService";
import { JudgeVerdict } from "@/types/TestCase";

const POLL_INTERVAL = 1000;

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
  outputType: z.enum(["text", "image"]).default("text"),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
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
  // "sql" is a form-only output type — it relabels fields below and unlocks the
  // reference-query helper, but is never sent to the backend as-is: the
  // problem's real (persisted) outputType is still "text", since SQL results
  // are graded via the same canonical string comparison as any other text
  // problem, just serialized differently by the SQL runner.
  const [uiOutputType, setUiOutputType] = useState<"text" | "image" | "sql">("text");
  const isSqlMode = uiOutputType === "sql";
  const [refQueries, setRefQueries] = useState<string[]>([""]);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  const updateRefQuery = (index: number, value: string) => {
    const updated = [...refQueries];
    updated[index] = value;
    setRefQueries(updated);
  };

  const generateExpectedOutput = async (index: number) => {
    const setupSql = testCases[index]?.input ?? "";
    const refQuery = refQueries[index] ?? "";
    if (!refQuery.trim()) {
      toast.error("Enter a reference query first");
      return;
    }

    setGeneratingIdx(index);
    try {
      const { job_id } = await runCode(refQuery, "sql", [
        { testCaseId: 1, input: setupSql, expectedOutput: "", isPublic: true },
      ]);

      let statusData: JudgeVerdict;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getRunStatus(job_id);
      } while (statusData.status === "pending");

      if (statusData.status === "completed") {
        const result = statusData.testResults?.[0];
        if (result && (result.status === "passed" || result.status === "failed")) {
          updateTestCase(index, "expectedOutput", result.actual ?? "");
          toast.success("Expected output generated from your reference query");
        } else {
          toast.error(result?.error || result?.errorMessage || "Reference query failed to run");
        }
      } else {
        toast.error(statusData.error?.errorMessage || "Reference query failed to run");
      }
    } catch {
      toast.error("Failed to generate expected output");
    } finally {
      setGeneratingIdx(null);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Fundamentals",
      prerequisites: "",
      learning_outcomes: "",
      tags: "",
      outputType: "text",
      testCases: [{ input: "", expectedOutput: "", isPublic: false }],
    },
  });

  const outputType = form.watch("outputType");

  const onSubmit = async (data: FormValues) => {
    if (data.outputType !== "image") {
      const emptyOutputs = data.testCases.filter(
        (tc) => !tc.expectedOutput.trim()
      );
      if (emptyOutputs.length > 0) {
        toast.error("Please provide expected output for all test cases");
        return;
      }
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
    setRefQueries([...refQueries, ""]);
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

    const newRefQueries = [...refQueries];
    newRefQueries.splice(index, 1);
    setRefQueries(newRefQueries);
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
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          onClick={() => navigate("/instructor/dashboard")}
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold">Create Problem</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define a coding problem with test cases for your students.
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
                      Title <span className="text-destructive">*</span>
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
                name="outputType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem Type</FormLabel>
                    <Select
                      onValueChange={(value: "text" | "image" | "sql") => {
                        setUiOutputType(value);
                        field.onChange(value === "sql" ? "text" : value);
                      }}
                      value={uiOutputType}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a problem type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text (stdout comparison)</SelectItem>
                        <SelectItem value="image">Image (PNG, manually graded)</SelectItem>
                        <SelectItem value="sql">SQL (query result, canonical text comparison)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {uiOutputType === "image"
                        ? 'Image problems skip automatic grading — the judge captures the PNG the program produces and an instructor reviews it by hand.'
                        : uiOutputType === "sql"
                        ? 'Relabels the test case fields below for the SQL convention (setup SQL / canonical result) and lets you generate expected output from a reference query instead of hand-formatting it. Select "SQL" as a language when creating the assignment.'
                        : 'The program\'s stdout is compared against the expected output for each test case.'}
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
                    Description <span className="text-destructive">*</span>
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
                Test Cases <span className="text-destructive">*</span>
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
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Test Case #{index + 1}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestCase(index)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`input-${index}`}>
                        {isSqlMode ? "Setup SQL (schema + seed data)" : "Input"}
                      </Label>
                      <Textarea
                        id={`input-${index}`}
                        value={testCase.input}
                        onChange={(e) =>
                          updateTestCase(index, "input", e.target.value)
                        }
                        placeholder={
                          isSqlMode
                            ? "CREATE TABLE students(name TEXT, age INT);\nINSERT INTO students VALUES ('Ana', 22), ('Bo', 19);"
                            : "Input for this test case"
                        }
                        className="mt-1 min-h-[80px] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`expected-${index}`}>
                        {isSqlMode ? "Expected Result (canonical)" : "Expected Output"}{" "}
                        {outputType !== "image" && (
                          <span className="text-destructive">*</span>
                        )}
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
                        placeholder={
                          outputType === "image"
                            ? "Not used for image problems — graded manually"
                            : isSqlMode
                            ? "Generate this from a reference query below, rather than typing it by hand"
                            : "Expected output for this test case"
                        }
                        disabled={outputType === "image"}
                        className="mt-1 min-h-[80px] font-mono text-sm"
                      />
                      {outputType !== "image" && !testCase.expectedOutput && (
                        <p className="text-destructive text-sm mt-1">
                          Expected output is required
                        </p>
                      )}
                    </div>
                  </div>

                  {isSqlMode && outputType !== "image" && (
                    <div className="mt-4 rounded-md border border-dashed border-border p-3">
                      <Label htmlFor={`refquery-${index}`} className="text-sm">
                        Reference query{" "}
                        <span className="text-muted-foreground font-normal">
                          (used only to generate expected output — not saved)
                        </span>
                      </Label>
                      <Textarea
                        id={`refquery-${index}`}
                        value={refQueries[index] ?? ""}
                        onChange={(e) => updateRefQuery(index, e.target.value)}
                        placeholder="SELECT name FROM students WHERE age > 20;"
                        className="mt-1 min-h-[60px] font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        disabled={generatingIdx === index}
                        onClick={() => generateExpectedOutput(index)}
                      >
                        {generatingIdx === index
                          ? "Running…"
                          : "Generate Expected Output"}
                      </Button>
                      <p className="text-muted-foreground text-xs mt-1">
                        Runs your query against the setup SQL in the real SQL
                        sandbox and fills in the canonical result above — the
                        exact same comparison students' submissions go through.
                      </p>
                    </div>
                  )}
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
