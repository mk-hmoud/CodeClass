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
import { runCode, getStatus } from "@/services/JudgeService";

const POLL_INTERVAL = 1000;

const CodeEditorPage = () => {
  const navigate = useNavigate();
  const { classroomId, assignmentId } = useParams();
  const { state = {} } = useLocation();
  const [assignment] = useState<Assignment | null>(state as Assignment | null);

  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
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

  const [selectedLanguage, setSelectedLanguage] = useState(
    supportedLanguages[0]
  );

  const handleRunCode = async (src: string) => {
    setIsRunning(true);
    try {
      const { job_id } = await runCode(src, selectedLanguage, publicTestCases);
      let statusData;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        statusData = await getStatus(job_id);
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
                  <div className="p-2 border-b flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center space-x-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">Testcases</span>
                        </div>
                        {testResults.length > 0 && (
                          <span className="text-muted-foreground">
                            | {testsPassed} / {totalTests} passing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow overflow-y-auto p-2">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {publicTestCases.map((testCase, idx) => (
                        <button
                          key={testCase.testCaseId}
                          onClick={() =>
                            handleTestCaseClick(testCase.testCaseId)
                          }
                          className={`px-3 py-1 rounded-md text-sm flex items-center ${
                            activeTestCaseId === testCase.testCaseId
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          {testResults.length > 0 && (
                            <span className="mr-1.5">
                              {testResults.find(
                                (r) => r.testCaseId === testCase.testCaseId
                              )?.status === "passed" ? (
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

                    {isRunning ? (
                      <div className="text-center py-4">
                        <div className="animate-spin mb-2 mx-auto h-5 w-5 border-2 border-primary border-r-transparent rounded-full"></div>
                        <p>Running your code...</p>
                      </div>
                    ) : (
                      <>
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

                            {activeTestResult ? (
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
                                    | Runtime: {activeTestResult.executionTime}
                                    ms
                                  </div>
                                )}
                              </>
                            ) : (
                              !isRunning && (
                                <div className="text-sm text-muted-foreground mt-2">
                                  Run your code to see the results
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={30}>
            <CodeEditor
              defaultLanguage={supportedLanguages[0]}
              defaultValue={code}
              onRunCode={handleRunCode}
              onChange={handleCodeChange}
              showButtons={true}
              supportedLanguages={supportedLanguages}
              onLanguageChange={handleLanguageChange}
              language={selectedLanguage}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default CodeEditorPage;
