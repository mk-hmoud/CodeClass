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
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";

import "@/lib/monacoConfig"; // Import the centralized Monaco config
import { TestCase, TestResult } from "@/types/TestCase";
import { Assignment } from "@/types/Assignment";
import {
  runCode,
  getRunStatus,
  submit,
  getSubmitStatus,
} from "@/services/JudgeService";
import { getRemainingAttempts } from "@/services/AssignmentService";
import { Progress } from "@radix-ui/react-progress";

const POLL_INTERVAL = 1000;

const CodeEditorPage = () => {
  const navigate = useNavigate();
  const { classroomId, assignmentId } = useParams();
  const { state = {} } = useLocation();
  const [assignment] = useState<Assignment | null>(state as Assignment | null);

  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmissionView, setIsSubmissionView] = useState(false);
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(
    null
  );
  const [testsPassed, setTestsPassed] = useState<number | null>(null);
  const [totalTests, setTotalTests] = useState<number | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [supportedLanguages] = useState(
    assignment.languages.map((alang) => alang.language.name)
  );
  const [initialCodes] = useState(
    assignment.languages.map((alang) => alang.initial_code)
  );
  const [code, setCode] = useState(initialCodes[0]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [publicTestCases] = useState<TestCase[]>(
    assignment?.problem?.testCases
  );
  const [activeTestCaseId, setActiveTestCaseId] = useState<number>(0);
  useEffect(() => {
    if (publicTestCases.length > 0) {
      setActiveTestCaseId(publicTestCases[0].testCaseId);
    }
  }, [publicTestCases]);
  const [privateTestResults, setPrivateTestResults] = useState<{
    total: number;
    passed: number;
  } | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState(
    supportedLanguages[0]
  );

  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "submitting" | "completed" | "error"
  >("idle");
  const [remainingAttempts, setRemainingAttempts] = useState(0);

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!assignmentId) return;
      const attempts = await getRemainingAttempts(+assignmentId);
      if (attempts === null) {
        setRemainingAttempts(Infinity);
      } else {
        setRemainingAttempts(attempts);
      }
    };
    fetchAttempts();
  }, [assignmentId]);

  const handleRunCode = async (src: string) => {
    setIsRunning(true);
    setIsSubmissionView(false);
    try {
      const { job_id } = await runCode(src, selectedLanguage, publicTestCases);
      let statusData;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getRunStatus(job_id);
      } while (
        statusData.status !== "completed" &&
        statusData.status !== "error"
      );

      if (statusData.status === "error") {
        toast.error("Code execution failed on the server");
      } else {
        const r = statusData.result!;
        setTestResults(r.testResults);
        setTestsPassed(r.passedTests);
        setTotalTests(r.totalTests);

        if (r.passedTests === r.totalTests) {
          toast.success("All tests passed! 🎉");
        } else {
          toast.error(`${r.passedTests}/${r.totalTests} tests failed`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error running or polling code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    console.log(remainingAttempts);
    if (remainingAttempts !== null && remainingAttempts <= 0) {
      toast.error("No submission attempts remaining");
      return;
    }

    setSubmissionStatus("submitting");
    setIsRunning(true);
    setIsSubmissionView(true);
    try {
      const { job_id } = await submit(
        assignment.assignmentId,
        code,
        selectedLanguage
      );

      let statusData;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getSubmitStatus(job_id);
        console.log(statusData);
      } while (
        statusData.status !== "completed" &&
        statusData.status !== "error"
      );

      if (statusData.status === "error") {
        setSubmissionStatus("error");
        toast.error("Submission failed on server");
      } else {
        const {
          testResults,
          passedTests,
          totalTests,
          score,
          privatePassed,
          privateTotal,
        } = statusData.result;

        setTestResults(testResults);
        setTestsPassed(passedTests);
        setTotalTests(totalTests);
        setPrivateTestResults({
          total: privateTotal,
          passed: privatePassed,
        });

        if (passedTests === totalTests && privatePassed === privateTotal) {
          toast.success("Code submitted successfully! All tests passed! 🎉");
        } else {
          toast.error(
            `Submission result: ${passedTests}/${totalTests} public and ${privatePassed}/${privateTotal} private tests passed`
          );
        }
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

  const activeTestResult = testResults.find(
    (tr) => tr.testCaseId === activeTestCaseId
  );

  const renderTestCasePanel = () => {
    if (isRunning) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin mb-2 mx-auto h-5 w-5 border-2 border-primary border-r-transparent rounded-full"></div>

          <p>Running your code...</p>
        </div>
      );
    }
    console.log(testResults);
    if (isSubmissionView) {
      return (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Public Test Results</h3>

              {testResults.map((result, idx) => (
                <div key={result.testCaseId} className="p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    {result.status === "passed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}

                    <span>
                      Public Test Case {idx + 1} -{" "}
                      {result.status === "passed" ? "Passed" : "Failed"}
                    </span>

                    <span className="ml-auto text-muted-foreground">
                      {result.executionTime}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {privateTestResults && (
              <div>
                <h3 className="font-medium mt-6 mb-2">Private Test Results</h3>

                <div className="p-4 rounded-md border space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Results</span>

                    <span className="font-medium">
                      {privateTestResults.passed} / {privateTestResults.total}{" "}
                      passed
                    </span>
                  </div>

                  <Progress
                    value={
                      (privateTestResults.passed / privateTestResults.total) *
                      100
                    }
                    className="h-1"
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
        <div className="mb-2 flex flex-wrap gap-2">
          {publicTestCases.map((testCase, idx) => (
            <button
              key={testCase.testCaseId}
              onClick={() => handleTestCaseClick(testCase.testCaseId)}
              className={`px-3 py-1 rounded-md text-sm flex items-center ${
                activeTestCaseId === testCase.testCaseId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              {testResults.length > 0 && (
                <span className="mr-1.5">
                  {testResults.find((r) => r.testCaseId === testCase.testCaseId)
                    ?.status === "passed" ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                </span>
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

                {output && (
                  <div
                    className={`text-sm ${
                      activeTestResult.status === "passed"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {activeTestResult.status === "passed"
                      ? "Accepted"
                      : "Wrong Answer"}{" "}
                    | Runtime: {activeTestResult.executionTime}ms
                  </div>
                )}
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
    console.log(assignment);
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center px-4 py-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBackToAssignment}
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold">{assignment.title}</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={20}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="h-full overflow-y-auto p-6">
                  <div>
                    <p>{assignment?.description}</p>
                    <strong>You will be solving the following problem</strong>
                  </div>
                  <div className="space-y-4 mt-5">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Title</h3>
                      <p>{assignment?.problem?.description}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-4">
                        Description
                      </h3>
                      <p>{assignment?.problem?.description}</p>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-full overflow-hidden flex flex-col">
                  {/* Header with count */}
                  <div className="p-2 border-b flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-sm">
                      <span className="font-semibold">Testcases</span>
                      {testResults.length > 0 && (
                        <span className="text-muted-foreground">
                          | {testsPassed} / {totalTests} passing
                        </span>
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
              <div className="border-t">
                {!isFinite(remainingAttempts) ? (
                  <Alert className="m-2">
                    <AlertDescription>
                      Unlimited submission attempts
                    </AlertDescription>
                  </Alert>
                ) : remainingAttempts > 0 ? (
                  <Alert className="m-2">
                    <AlertDescription>
                      You have {remainingAttempts} submission attempt
                      {remainingAttempts !== 1 ? "s" : ""} remaining
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive" className="m-2">
                    <AlertDescription>
                      You have no submission attempts remaining
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default CodeEditorPage;
