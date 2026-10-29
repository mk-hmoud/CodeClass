import React, { useEffect, useRef, useState } from "react";
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
import { ArrowLeft, ChevronRight, Copy, Download, Plus, Save, Sparkles, Trash, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TestCase } from "../../types/TestCase";
import {
  createProblem,
  getAiStatus,
  suggestTestCases as requestAiTestCases,
  SuggestedTestCase,
} from "@/services/ProblemService";
import SystemsAuthoring, { SystemsAuthoringHandle } from "./SystemsAuthoring";
import { runCode, getRunStatus } from "@/services/JudgeService";
import { JudgeVerdict } from "@/types/TestCase";
import { getSchemaLibraries } from "@/services/SchemaLibraryService";
import { SchemaLibrary } from "@/types/SchemaLibrary";
import { parseTestCaseFile, testCasesToJson } from "@/lib/testCaseIO";
import { downloadBlob } from "@/services/ExportService";

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
        schemaLibraryId: z.number().nullable().optional(),
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
  // Per-case collapse state (parallel to `testCases`): collapsed rows show a
  // one-line summary so long test-case lists stay scannable.
  const [collapsed, setCollapsed] = useState<boolean[]>([false]);
  // "sql" is a form-only output type — it relabels fields below and unlocks the
  // reference-query helper, but is never sent to the backend as-is: the
  // problem's real (persisted) outputType is still "text", since SQL results
  // are graded via the same canonical string comparison as any other text
  // problem, just serialized differently by the SQL runner.
  const [uiOutputType, setUiOutputType] = useState<"text" | "image" | "sql">("text");
  const isSqlMode = uiOutputType === "sql";
  const [refQueries, setRefQueries] = useState<string[]>([""]);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  // Setup SQL either points at a reusable, instructor-managed schema library
  // (like code Libraries — a live reference, edits to the library apply to
  // every test case using it) or is written one-off, inline, like before.
  const [schemaLibraries, setSchemaLibraries] = useState<SchemaLibrary[]>([]);
  const [setupSource, setSetupSource] = useState<("library" | "oneoff")[]>(["oneoff"]);

  useEffect(() => {
    if (isSqlMode) {
      getSchemaLibraries().then(setSchemaLibraries);
    }
  }, [isSqlMode]);

  const updateRefQuery = (index: number, value: string) => {
    const updated = [...refQueries];
    updated[index] = value;
    setRefQueries(updated);
  };

  const updateSetupSource = (index: number, source: "library" | "oneoff") => {
    const updated = [...setupSource];
    updated[index] = source;
    setSetupSource(updated);
    if (source === "oneoff") {
      updateTestCase(index, "schemaLibraryId", null);
    } else {
      updateTestCase(index, "input", "");
    }
  };

  const selectSchemaLibrary = (index: number, schemaLibraryId: string) => {
    updateTestCase(index, "schemaLibraryId", Number(schemaLibraryId));
  };

  const effectiveSetupSql = (index: number): string => {
    if (setupSource[index] === "library") {
      const library = schemaLibraries.find(
        (s) => s.schemaLibraryId === testCases[index]?.schemaLibraryId
      );
      return library?.setupSql ?? "";
    }
    return testCases[index]?.input ?? "";
  };

  const generateExpectedOutput = async (index: number) => {
    const setupSql = effectiveSetupSql(index);
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

  const [isSystems, setIsSystems] = useState(false);
  const systemsRef = useRef<SystemsAuthoringHandle>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Append a batch of test cases (from file import or AI), collapsing them so a
  // large batch stays scannable. If the set is still the single pristine blank
  // case, replace it rather than leaving an empty row on top.
  const appendTestCases = (
    incoming: Array<Pick<TestCase, "input" | "expectedOutput" | "isPublic">>
  ) => {
    const added: TestCase[] = incoming.map((p) => ({
      input: p.input ?? "",
      expectedOutput: p.expectedOutput ?? "",
      isPublic: !!p.isPublic,
    }));
    const pristine =
      testCases.length === 1 && !testCases[0].input && !testCases[0].expectedOutput;
    const base = pristine
      ? { tests: [] as TestCase[], refs: [] as string[], sources: [] as ("library" | "oneoff")[], collapsed: [] as boolean[] }
      : { tests: testCases, refs: refQueries, sources: setupSource, collapsed };

    const nextTests = [...base.tests, ...added];
    setTestCases(nextTests);
    form.setValue(
      "testCases",
      nextTests.map((t) => ({ ...t }))
    );
    setRefQueries([...base.refs, ...added.map(() => "")]);
    setSetupSource([...base.sources, ...added.map<"library" | "oneoff">(() => "oneoff")]);
    setCollapsed([...base.collapsed, ...added.map(() => true)]);
    return added.length;
  };

  // Bulk-import test cases from a JSON or CSV/TSV file.
  const importTestCases = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseTestCaseFile(file.name, text);
      const n = appendTestCases(parsed);
      toast.success(`Imported ${n} test case${n === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  };

  const exportTestCases = () => {
    const blob = new Blob([testCasesToJson(testCases)], { type: "application/json" });
    const title = form.getValues().title?.trim();
    const safe = (title || "problem").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    downloadBlob(blob, `${safe}_test_cases.json`);
  };

  // --- AI-suggested test cases (#10) --------------------------------------
  // The server reports whether a provider is configured; the button only shows
  // when it is. Suggestions land in a review dialog — the instructor picks
  // which to add, since AI-generated expected outputs can be wrong.
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCount, setAiCount] = useState(5);
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<SuggestedTestCase & { selected: boolean }>
  >([]);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    getAiStatus()
      .then(setAiEnabled)
      .catch(() => setAiEnabled(false));
  }, []);

  const openAiDialog = () => {
    setAiError(null);
    setAiSuggestions([]);
    setAiOpen(true);
  };

  const generateAiSuggestions = async () => {
    const { title, description, category } = form.getValues();
    if (!title?.trim() || !description?.trim()) {
      setAiError("Add a problem title and description first — the AI works from them.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const existingInputs = testCases
        .map((t) => t.input?.trim())
        .filter((i): i is string => !!i);
      const suggestions = await requestAiTestCases({
        title,
        description,
        category,
        outputType: uiOutputType,
        count: aiCount,
        existingInputs,
      });
      if (suggestions.length === 0) {
        setAiError("The AI didn't return any usable test cases. Try again, or add detail to the description.");
      }
      setAiSuggestions(suggestions.map((s) => ({ ...s, selected: true })));
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      setAiError(
        e.response?.data?.message ||
          (e.response?.status === 503
            ? "AI suggestions aren't configured on the server yet."
            : "Couldn't reach the AI provider. Please try again.")
      );
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAiSuggestion = (index: number) => {
    setAiSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const addSelectedAiSuggestions = () => {
    const chosen = aiSuggestions.filter((s) => s.selected);
    if (chosen.length === 0) {
      toast.error("Select at least one suggestion to add.");
      return;
    }
    const n = appendTestCases(
      chosen.map((s) => ({
        input: s.input,
        expectedOutput: s.expectedOutput,
        isPublic: s.isPublic,
      }))
    );
    toast.success(`Added ${n} AI-suggested test case${n === 1 ? "" : "s"} — review before saving`);
    setAiOpen(false);
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
    if (isSystems) {
      const sys = systemsRef.current?.getPayload();
      if (!sys) return;
      try {
        await createProblem({
          title: data.title,
          description: data.description,
          category: data.category,
          prerequisites: data.prerequisites,
          learning_outcomes: data.learning_outcomes,
          tags: data.tags,
          ...sys,
        });
        toast.success(`Problem "${data.title}" created successfully`);
        navigate("/instructor/dashboard");
      } catch (error) {
        console.error("Error creating problem:", error);
        toast.error("Error creating problem");
      }
      return;
    }
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
    setSetupSource([...setupSource, "oneoff"]);
    setCollapsed([...collapsed, false]);
  };

  // Insert a copy of a test case right after it, duplicating every parallel
  // array (ref query, setup source) so the clone carries the SQL state too.
  const cloneTestCase = (index: number) => {
    const src = testCases[index];
    const copy: TestCase = {
      input: src.input,
      expectedOutput: src.expectedOutput,
      isPublic: src.isPublic,
      schemaLibraryId: src.schemaLibraryId ?? null,
    };
    const at = index + 1;
    const insert = <T,>(arr: T[], value: T): T[] => {
      const next = [...arr];
      next.splice(at, 0, value);
      return next;
    };
    setTestCases(insert(testCases, copy));
    form.setValue("testCases", insert(form.getValues().testCases, { ...copy }));
    setRefQueries(insert(refQueries, refQueries[index] ?? ""));
    setSetupSource(insert(setupSource, setupSource[index] ?? "oneoff"));
    setCollapsed(insert(collapsed, false));
  };

  const toggleCollapsed = (index: number) => {
    setCollapsed((prev) => prev.map((c, i) => (i === index ? !c : c)));
  };

  const allCollapsed = testCases.length > 0 && collapsed.every(Boolean);
  const toggleAllCollapsed = () => {
    const next = !allCollapsed;
    setCollapsed(testCases.map(() => next));
  };

  // One-line summary shown when a case is collapsed.
  const testCasePreview = (tc: TestCase): string => {
    const firstLine = (s?: string) => (s ?? "").split("\n")[0].slice(0, 48);
    if (outputType === "image") return firstLine(tc.input) || "(image problem)";
    const inp = firstLine(tc.input);
    const out = firstLine(tc.expectedOutput);
    if (!inp && !out) return "(empty)";
    return `${inp || "∅"} → ${out || "∅"}`;
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

    const newSetupSource = [...setupSource];
    newSetupSource.splice(index, 1);
    setSetupSource(newSetupSource);

    const newCollapsed = [...collapsed];
    newCollapsed.splice(index, 1);
    setCollapsed(newCollapsed);
  };

  const updateTestCase = (
    index: number,
    field: keyof TestCase,
    value: string | boolean | number | null
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
          <div className="flex items-center gap-2">
            <Label className="text-sm">Problem kind:</Label>
            <Button type="button" size="sm" variant={!isSystems ? "default" : "outline"} onClick={() => setIsSystems(false)}>Standard</Button>
            <Button type="button" size="sm" variant={isSystems ? "default" : "outline"} onClick={() => setIsSystems(true)}>Systems (C)</Button>
          </div>
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

          {!isSystems && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>
                Test Cases <span className="text-destructive">*</span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {testCases.length} total
                </span>
              </Label>
              <div className="flex items-center gap-2">
                {testCases.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllCollapsed}
                    className="text-xs text-muted-foreground"
                  >
                    {allCollapsed ? "Expand all" : "Collapse all"}
                  </Button>
                )}
                {aiEnabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={openAiDialog}
                    className="flex items-center gap-1 text-primary"
                    title="Suggest test cases with AI from the problem description"
                  >
                    <Sparkles size={14} />
                    Suggest with AI
                  </Button>
                )}
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,.csv,.tsv,.txt,application/json,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importTestCases(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-1 text-muted-foreground"
                  title="Import test cases from a JSON or CSV/TSV file"
                >
                  <Upload size={14} />
                  Import
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={exportTestCases}
                  className="flex items-center gap-1 text-muted-foreground"
                  title="Export these test cases as JSON"
                >
                  <Download size={14} />
                  Export
                </Button>
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
            </div>

            {testCases.map((testCase, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(index)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <ChevronRight
                        size={16}
                        className={`shrink-0 text-muted-foreground transition-transform ${
                          collapsed[index] ? "" : "rotate-90"
                        }`}
                      />
                      <h3 className="shrink-0 text-sm font-semibold text-muted-foreground">
                        Test Case #{index + 1}
                      </h3>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          testCase.isPublic
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {testCase.isPublic ? "Public" : "Hidden"}
                      </span>
                      {collapsed[index] && (
                        <span className="truncate font-mono text-xs text-muted-foreground/80">
                          {testCasePreview(testCase)}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => cloneTestCase(index)}
                        className="h-8 w-8 p-0 text-muted-foreground"
                        title="Duplicate this test case"
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTestCase(index)}
                        className="h-8 w-8 p-0 text-destructive"
                        title="Remove this test case"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>

                  {!collapsed[index] && (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`input-${index}`}>
                        {isSqlMode ? "Setup SQL (schema + seed data)" : "Input"}
                      </Label>

                      {isSqlMode && (
                        <RadioGroup
                          value={setupSource[index] ?? "oneoff"}
                          onValueChange={(value) =>
                            updateSetupSource(index, value as "library" | "oneoff")
                          }
                          className="mt-1 mb-2 flex items-center gap-4"
                        >
                          <div className="flex items-center gap-1.5">
                            <RadioGroupItem value="library" id={`source-library-${index}`} />
                            <Label htmlFor={`source-library-${index}`} className="text-xs font-normal cursor-pointer">
                              Use a schema library
                            </Label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <RadioGroupItem value="oneoff" id={`source-oneoff-${index}`} />
                            <Label htmlFor={`source-oneoff-${index}`} className="text-xs font-normal cursor-pointer">
                              Write one-off SQL
                            </Label>
                          </div>
                        </RadioGroup>
                      )}

                      {isSqlMode && setupSource[index] === "library" ? (
                        <>
                          <Select
                            value={testCase.schemaLibraryId ? String(testCase.schemaLibraryId) : undefined}
                            onValueChange={(value) => selectSchemaLibrary(index, value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a schema library" />
                            </SelectTrigger>
                            <SelectContent>
                              {schemaLibraries.map((library) => (
                                <SelectItem
                                  key={library.schemaLibraryId}
                                  value={String(library.schemaLibraryId)}
                                >
                                  {library.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {schemaLibraries.length === 0 && (
                            <p className="text-muted-foreground text-xs mt-1">
                              No schema libraries yet — create one from the
                              instructor dashboard's "Schema Libraries" tab, or
                              switch to "Write one-off SQL".
                            </p>
                          )}
                          {testCase.schemaLibraryId && (
                            <pre className="mt-2 text-xs bg-background p-2 rounded-md max-h-32 overflow-auto whitespace-pre-wrap">
                              {schemaLibraries.find((s) => s.schemaLibraryId === testCase.schemaLibraryId)?.setupSql}
                            </pre>
                          )}
                        </>
                      ) : (
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
                      )}
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
                  </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {isSystems && (
            <div className="space-y-4">
              <SystemsAuthoring ref={systemsRef} />
            </div>
          )}

          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  Suggest test cases with AI
                </DialogTitle>
                <DialogDescription>
                  Generated from the problem title and description. Pick the ones to
                  add — expected outputs are AI-generated and may be wrong, so review
                  them before saving.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <Label htmlFor="ai-count" className="text-sm">
                  How many
                </Label>
                <Input
                  id="ai-count"
                  type="number"
                  min={1}
                  max={12}
                  value={aiCount}
                  onChange={(e) =>
                    setAiCount(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-20"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={generateAiSuggestions}
                  disabled={aiLoading}
                  className="gap-1.5"
                >
                  <Sparkles size={14} />
                  {aiLoading
                    ? "Generating…"
                    : aiSuggestions.length
                    ? "Regenerate"
                    : "Generate"}
                </Button>
              </div>

              {aiError && <p className="text-sm text-destructive">{aiError}</p>}

              {aiSuggestions.length > 0 && (
                <div className="max-h-[50vh] space-y-2 overflow-auto pr-1">
                  {aiSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className={`rounded-md border p-3 ${
                        s.selected ? "border-primary/50 bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id={`ai-${i}`}
                          checked={s.selected}
                          onCheckedChange={() => toggleAiSuggestion(i)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            {s.rationale && (
                              <span className="text-xs font-medium text-foreground">
                                {s.rationale}
                              </span>
                            )}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                s.isPublic
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {s.isPublic ? "Public" : "Hidden"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Input
                              </p>
                              <pre className="mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-1.5 font-mono text-xs">
                                {s.input || "∅"}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Expected
                              </p>
                              <pre className="mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-1.5 font-mono text-xs">
                                {s.expectedOutput || "∅"}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAiOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={addSelectedAiSuggestions}
                  disabled={aiSuggestions.filter((s) => s.selected).length === 0}
                >
                  Add selected ({aiSuggestions.filter((s) => s.selected).length})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
