import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Copy,
  CheckCircle,
  XCircle,
  Save,
  FileCode,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CodeEditor from "@/components/CodeEditor";

import "@/lib/monacoConfig"; // Import the centralized Monaco config
import { TestCase, JudgeVerdict } from "@/types/TestCase";
import { Assignment } from "@/types/Assignment";
import {
  runCode,
  getRunStatus,
  submit,
  getSubmitStatus,
} from "@/services/JudgeService";
import { getRemainingAttempts } from "@/services/AssignmentService";
import { Progress } from "@radix-ui/react-progress";
import {
  getCodeDraft,
  removeCodeDraft,
  saveCodeDraft,
} from "@/utils/CodeDraftManager";

const POLL_INTERVAL = 1000;

//default
const emptyVerdict: JudgeVerdict = {
  status: "pending",
  testResults: [],
  metrics: {
    passedTests: 0,
    totalTests: 0,
    averageRuntime: 0,
  },
};

const CodeEditorPage = () => {
  const navigate = useNavigate();
  const { classroomId, assignmentId } = useParams();
  const { state = {} } = useLocation();
  const [assignment] = useState<Assignment | null>(state as Assignment | null);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmissionView, setIsSubmissionView] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [supportedLanguages] = useState(
    assignment.languages.map((alang) => alang.language.name)
  );
  const [initialCodes] = useState(
    assignment.languages.map((alang) => alang.initial_code)
  );
  const [code, setCode] = useState(initialCodes[0]);
  const [publicTestCases] = useState<TestCase[]>(
    assignment?.problem?.testCases
  );
  const [activeTestCaseId, setActiveTestCaseId] = useState<number>(0);

  const [runVerdict, setRunVerdict] = useState<JudgeVerdict>(emptyVerdict);
  const [submitVerdict, setSubmitVerdict] =
    useState<JudgeVerdict>(emptyVerdict);

  const [selectedLanguage, setSelectedLanguage] = useState(
    supportedLanguages[0]
  );

  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "submitting" | "completed" | "error"
  >("idle");
  const [remainingAttempts, setRemainingAttempts] = useState(0);

  useEffect(() => {
    if (assignmentId) {
      const savedDraft = getCodeDraft(assignmentId);
      if (savedDraft) {
        const langIndex = supportedLanguages.findIndex(
          (lang) => lang === savedDraft.language
        );
        if (langIndex !== -1) {
          setSelectedLanguage(savedDraft.language);
          setCode(savedDraft.code);
          setActiveTabIndex(langIndex);
          toast.info("Loaded your previously saved draft");
        }
      }
    }
  }, [assignmentId, supportedLanguages]);

  useEffect(() => {
    if (!assignmentId) return;
    (async () => {
      try {
        const attempts = await getRemainingAttempts(Number(assignmentId));
        setRemainingAttempts(attempts);
      } catch (err) {
        console.error("Error fetching remaining attempts:", err);
      }
    })();
  }, [assignmentId]);

  const handleSaveCode = () => {
    try {
      const success = saveCodeDraft(
        assignmentId,
        code,
        selectedLanguage,
        assignment.dueDate ? new Date(assignment.dueDate) : null,
        assignment.title
      );

      if (success) {
        toast.success("Code saved successfully");
      } else {
        toast.error("Failed to save code");
      }
    } catch (error) {
      toast.error("Failed to save code");
      console.error("Save error:", error);
    }
  };

  const handleRunCode = async (src: string) => {
    setIsRunning(true);
    setIsSubmissionView(false);
    setRunVerdict({ ...emptyVerdict });

    try {
      const { job_id } = await runCode(src, selectedLanguage, publicTestCases);
      let statusData: JudgeVerdict;

      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getRunStatus(job_id);
        setRunVerdict(statusData);
      } while (statusData.status === "pending");

      if (statusData.status === "compile_error" && statusData.error) {
        toast.error(`Compilation error: ${statusData.error.errorMessage}`);
        setIsRunning(false);
        return;
      }

      if (statusData.status === "system_error" && statusData.error) {
        toast.error(`System error: ${statusData.error.errorMessage}`);
        setIsRunning(false);
        return;
      }

      if (
        statusData.status === "completed" &&
        statusData.testResults &&
        statusData.metrics
      ) {
        setRunVerdict(statusData);

        if (statusData.metrics.passedTests === statusData.metrics.totalTests) {
          toast.success("All tests passed! 🎉");
        } else {
          toast.error(
            `${statusData.metrics.passedTests}/${statusData.metrics.totalTests} tests passed`
          );
        }
      } else {
        toast.error("Received unexpected response format from server");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error running or polling code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (remainingAttempts !== null && remainingAttempts <= 0) {
      toast.error("No submission attempts remaining");
      return;
    }

    setSubmissionStatus("submitting");
    setIsRunning(true);
    setIsSubmissionView(true);
    setSubmitVerdict({ ...emptyVerdict });

    try {
      const { job_id } = await submit(
        assignment.assignmentId,
        code,
        selectedLanguage
      );

      let statusData: JudgeVerdict;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getSubmitStatus(job_id);
        setSubmitVerdict(statusData);
      } while (statusData.status === "pending");

      if (statusData.status === "compile_error" && statusData.error) {
        toast.error(`Compilation error: ${statusData.error.errorMessage}`);
        setSubmissionStatus("error");
        setIsRunning(false);
        return;
      }

      if (statusData.status === "system_error" && statusData.error) {
        toast.error(`System error: ${statusData.error.errorMessage}`);
        setSubmissionStatus("error");
        setIsRunning(false);
        return;
      }

      if (
        statusData.status === "completed" &&
        statusData.testResults &&
        statusData.metrics
      ) {
        setSubmitVerdict(statusData);
        removeCodeDraft(assignmentId);
        const privatePassed = statusData.metrics.privatePassedTests || 0;
        const privateTotal = statusData.metrics.privateTestsTotal || 0;

        if (
          statusData.metrics.passedTests === statusData.metrics.totalTests &&
          privatePassed === privateTotal
        ) {
          toast.success("Code submitted successfully! All tests passed! 🎉");
        } else {
          toast.error(
            `Submission result: ${statusData.metrics.passedTests}/${statusData.metrics.totalTests} public and ${privatePassed}/${privateTotal} private tests passed`
          );
        }
      } else {
        toast.error("Received unexpected response format from server");
        setSubmissionStatus("error");
        setIsRunning(false);
        return;
      }

      if (isFinite(remainingAttempts)) {
        setRemainingAttempts((prev) => prev - 1);
      }
      setSubmissionStatus("completed");
    } catch (error) {
      toast.error("Failed to submit code. Please try again.");
      setSubmissionStatus("error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      const index = supportedLanguages.indexOf(newLanguage);
      if (index !== -1) {
        setSelectedLanguage(newLanguage);
        setCode(initialCodes[index]);
      }
    },
    [supportedLanguages, initialCodes]
  );

  const goBackToAssignment = () => {
    navigate(
      `/student/classrooms/${classroomId}/assignments/${assignmentId}/view`
    );
  };

  const handleTestCaseClick = (testCaseId: number) => {
    setActiveTestCaseId(testCaseId);
  };

  const activeTestCase = publicTestCases.find(
    (tc) => tc.testCaseId === activeTestCaseId
  );

  const currentVerdict = isSubmissionView ? submitVerdict : runVerdict;
  const testResults = currentVerdict.testResults || [];
  const testsPassed = currentVerdict.metrics?.passedTests || 0;
  const totalTests = currentVerdict.metrics?.totalTests || 0;
  const averageRuntime = currentVerdict.metrics?.averageRuntime;

  const activeTestResult = testResults.find(
    (tr) => tr.testCaseId === activeTestCaseId
  );

  const renderTestCasePanel = () => {
    if (
      (currentVerdict.status === "compile_error" ||
        currentVerdict.status === "system_error") &&
      currentVerdict.error
    ) {
      return (
        <div className="p-4 rounded-md border bg-red-50">
          <h3 className="font-medium text-red-700 mb-2">
            {currentVerdict.status === "compile_error"
              ? "Compilation Error"
              : "System Error"}
          </h3>
          <div className="bg-red-100 p-3 rounded text-red-900 font-mono text-sm whitespace-pre-wrap">
            {currentVerdict.error.errorMessage}
          </div>

          {currentVerdict.error.fullError && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-red-700">
                Show full error
              </summary>
              <div className="bg-red-100 p-3 mt-2 rounded text-red-900 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                {currentVerdict.error.fullError}
              </div>
            </details>
          )}
        </div>
      );
    }

    if (isRunning) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin mb-2 mx-auto h-5 w-5 border-2 border-primary border-r-transparent rounded-full"></div>

          <p>Running your code...</p>
          {currentVerdict.status === "pending" && (
            <p className="text-sm text-muted-foreground mt-2">
              Waiting for results...
            </p>
          )}
        </div>
      );
    }

    if (isSubmissionView) {
      return (
        <>
          <div className="space-y-4">
            {typeof averageRuntime === "number" && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock size={14} />
                <span>
                  Average runtime: <strong>{averageRuntime} ms</strong>
                </span>
              </div>
            )}
            <div className="space-y-2">
              <h3 className="font-medium">Public Test Results</h3>

              {testResults
                .filter((result) => result.isPublic)
                .map((result, idx) => (
                  <div
                    key={result.testCaseId ?? idx}
                    className={`p-3 rounded-md border transition-colors ${
                      result.status === "passed"
                        ? "border-l-green-500 border-l-4"
                        : "border-l-red-500 border-l-4"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.status === "passed" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}

                      <span>
                        Public Test Case {idx + 1} –{" "}
                        {result.status === "passed" ? "Passed" : "Failed"}
                      </span>

                      <span className="ml-auto text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {result.executionTime}ms
                      </span>
                    </div>

                    {result.status === "error" && result.errorMessage && (
                      <div className="mt-2 text-sm text-red-500 flex items-start gap-1">
                        <AlertTriangle size={14} className="mt-0.5" />
                        <span>{result.errorMessage}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {submitVerdict.metrics && (
              <div>
                <h3 className="font-medium mt-6 mb-2">Private Test Results</h3>

                <div className="p-4 rounded-md border space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Results</span>

                    <span className="font-medium">
                      {submitVerdict.metrics.privatePassedTests} /{" "}
                      {submitVerdict.metrics.privateTestsTotal} passed
                    </span>
                  </div>

                  <Progress
                    value={
                      (submitVerdict.metrics.privatePassedTests /
                        submitVerdict.metrics.privateTestsTotal) *
                      100
                    }
                    className="h-2 bg-gray-100"
                    style={{
                      background:
                        "linear-gradient(to right, #10b981 0%, #10b981 var(--value), #e5e7eb var(--value), #e5e7eb 100%)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        <div className="mb-3 flex flex-wrap gap-2">
          {publicTestCases.map((testCase, idx) => (
            <button
              key={testCase.testCaseId}
              onClick={() => handleTestCaseClick(testCase.testCaseId)}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors ${
                activeTestCaseId === testCase.testCaseId
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "hover:bg-muted border border-transparent hover:border-gray-200"
              }`}
            >
              {testResults.length > 0 ? (
                testResults.find((r) => r.testCaseId === testCase.testCaseId)
                  ?.status === "passed" ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-gray-300"></div>
              )}
              Case {idx + 1}
            </button>
          ))}
        </div>

        {activeTestCase && (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                Input
              </div>

              <div className="bg-muted p-2 rounded-md whitespace-pre-wrap font-mono text-sm">
                {activeTestCase.input}
              </div>
            </div>

            {activeTestResult && (
              <>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Output
                  </div>

                  <div className="bg-muted p-2 rounded-md whitespace-pre-wrap font-mono text-sm">
                    {activeTestResult.actual}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Expected
                  </div>

                  <div className="bg-muted p-2 rounded-md whitespace-pre-wrap font-mono text-sm">
                    {activeTestCase.expectedOutput}
                  </div>
                </div>

                <div
                  className={`text-sm flex items-center gap-1.5 ${
                    activeTestResult.status === "passed"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {activeTestResult.status === "passed" ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <XCircle size={16} className="text-red-600" />
                  )}

                  <span>
                    {activeTestResult.status === "passed"
                      ? "Accepted"
                      : activeTestResult.status === "error"
                      ? `Error: ${
                          activeTestResult.errorMessage || "Unknown error"
                        }`
                      : activeTestResult.status === "timeout"
                      ? "Time Limit Exceeded"
                      : "Wrong Answer"}
                  </span>

                  {activeTestResult.executionTime !== undefined && (
                    <span className="text-gray-500 ml-1 flex items-center gap-1">
                      <Clock size={14} />
                      {activeTestResult.executionTime}ms
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </>
    );
  };

  // not scrollable for a full-height layout
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  const formatAttemptsDisplay = () => {
    if (!isFinite(remainingAttempts)) {
      return (
        <Badge
          variant="outline"
          className="font-normal flex items-center gap-1 py-1 px-2"
        >
          <FileCode size={14} />
          <span>Unlimited Attempts</span>
        </Badge>
      );
    } else if (remainingAttempts > 0) {
      return (
        <Badge
          variant="outline"
          className={`font-normal flex items-center gap-1 py-1 px-2 ${
            remainingAttempts <= 2 ? "bg-amber-50" : ""
          }`}
        >
          <FileCode size={14} />
          <span>
            {remainingAttempts} Attempt{remainingAttempts !== 1 ? "s" : ""}
          </span>
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="destructive"
          className="font-normal flex items-center gap-1 py-1 px-2"
        >
          <AlertTriangle size={14} />
          <span>No Attempts Left</span>
        </Badge>
      );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBackToAssignment}
            className="mr-2"
          >
            <ArrowLeft size={20} />
          </Button>

          <h1 className="text-xl font-semibold">{assignment.title}</h1>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="ml-4">{formatAttemptsDisplay()}</div>
              </TooltipTrigger>
              <TooltipContent>
                {!isFinite(remainingAttempts)
                  ? "You have unlimited submission attempts"
                  : remainingAttempts > 0
                  ? `You have ${remainingAttempts} submission attempt${
                      remainingAttempts !== 1 ? "s" : ""
                    } remaining`
                  : "You have no submission attempts remaining"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSaveCode}
            className="flex items-center gap-1.5"
          >
            <Save size={16} />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={20}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="h-full overflow-y-auto p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-4 pb-2 border-b">
                        Description
                      </h3>
                      <div className="prose max-w-none">
                        <p>{assignment?.problem?.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-full overflow-hidden flex flex-col">
                  {/* Header with count */}
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">Test Cases</span>
                      {testResults.length > 0 && (
                        <Badge
                          variant={
                            testsPassed === totalTests ? "outline" : "secondary"
                          }
                          className={`ml-2 ${
                            testsPassed === totalTests
                              ? "bg-green-50 text-green-700 hover:bg-green-50"
                              : ""
                          }`}
                        >
                          {testsPassed} / {totalTests} passed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Results panels */}
                  <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {renderTestCasePanel()}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full flex flex-col">
              <CodeEditor
                defaultLanguage={supportedLanguages[0]}
                defaultValue={code}
                onRunCode={handleRunCode}
                onSubmitCode={handleSubmitCode}
                onChange={handleCodeChange}
                showButtons={true}
                supportedLanguages={supportedLanguages}
                onLanguageChange={handleLanguageChange}
                language={selectedLanguage}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default CodeEditorPage;
