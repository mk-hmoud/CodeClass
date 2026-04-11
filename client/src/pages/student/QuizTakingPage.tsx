import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CodeEditor from "@/components/CodeEditor";
import "@/lib/monacoConfig";
import { JudgeVerdict } from "@/types/TestCase";
import { Language } from "@/types/Language";
import { getLanguages } from "@/services/LanguageService";
import {
  startSession,
  submitProblemCode,
  getQuizSubmitStatus,
  submitSession,
} from "@/services/QuizService";
import { runCode, getRunStatus } from "@/services/JudgeService";

const POLL_INTERVAL = 1000;

interface Problem {
  quizProblemId: number;
  problemId: number;
  title: string;
  description: string;
  category: string;
  points: number;
  problemOrder: number;
  publicTestCount: number;
  submission?: {
    submissionId: number;
    status: string;
    passedTests: number;
    totalTests: number;
    autoScore: number;
  } | null;
}

interface Session {
  session_id: number;
  status: string;
  start_time: string;
  timeLimitMinutes: number;
  problems: Problem[];
}

const QuizTakingPage: React.FC = () => {
  const { classroomId, quizId } = useParams<{ classroomId: string; quizId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);

  // Per-problem code state keyed by quizProblemId
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);

  // Judge state per problem
  const [verdicts, setVerdicts] = useState<Record<number, JudgeVerdict>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [running, setRunning] = useState(false);

  // Timer
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const autoSubmitRef = useRef(false);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [sess, langs] = await Promise.all([
          startSession(Number(quizId)),
          getLanguages(),
        ]);
        setSession(sess);
        setLanguages(langs);
        if (langs.length > 0) setSelectedLanguage(langs[0]);

        // Seed codes with empty string per problem
        const initial: Record<number, string> = {};
        for (const p of sess.problems) initial[p.quizProblemId] = "";
        setCodes(initial);

        // Seed verdicts from existing submissions
        const initVerdicts: Record<number, JudgeVerdict> = {};
        for (const p of sess.problems) {
          if (p.submission?.status === "completed") {
            initVerdicts[p.quizProblemId] = {
              status: "completed",
              metrics: {
                passedTests: p.submission.passedTests,
                totalTests: p.submission.totalTests,
              },
            };
          }
        }
        setVerdicts(initVerdicts);

        // Start timer
        const elapsed = Math.floor(
          (Date.now() - new Date(sess.start_time).getTime()) / 1000
        );
        const totalSeconds = sess.timeLimitMinutes * 60;
        setSecondsLeft(Math.max(0, totalSeconds - elapsed));
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Failed to start quiz");
        navigate(`/student/classrooms/${classroomId}/view`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [quizId, classroomId, navigate]);

  // ── Countdown timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true;
        handleSubmitQuiz(true);
      }
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s !== null ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const timerColor =
    secondsLeft !== null && secondsLeft < 120
      ? "text-red-400"
      : secondsLeft !== null && secondsLeft < 300
      ? "text-amber-400"
      : "text-white";

  // ── Active problem ────────────────────────────────────────────────────────────
  const activeProblem = session?.problems[activeProblemIndex] ?? null;

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (!activeProblem) return;
      setCodes((prev) => ({ ...prev, [activeProblem.quizProblemId]: newCode }));
    },
    [activeProblem]
  );

  const handleLanguageChange = useCallback(
    (langName: string) => {
      const lang = languages.find((l) => l.name === langName);
      if (lang) setSelectedLanguage(lang);
    },
    [languages]
  );

  // ── Run (public tests only via existing judge/run) ────────────────────────────
  const handleRun = async (src: string) => {
    if (!activeProblem || !selectedLanguage) return;
    setRunning(true);
    setVerdicts((prev) => ({
      ...prev,
      [activeProblem.quizProblemId]: { status: "pending" },
    }));

    try {
      // We don't have public test cases fetched here — inform the user
      // to use Submit Problem for full judging. Run uses an empty test set.
      toast.info("Run is not available for quizzes. Use 'Submit Problem' to judge against test cases.");
    } finally {
      setRunning(false);
    }
  };

  // ── Submit single problem ─────────────────────────────────────────────────────
  const handleSubmitProblem = async () => {
    if (!activeProblem || !session || !selectedLanguage) return;
    const code = codes[activeProblem.quizProblemId];
    if (!code?.trim()) {
      toast.error("Write some code before submitting.");
      return;
    }

    const qpId = activeProblem.quizProblemId;
    setSubmitting((prev) => ({ ...prev, [qpId]: true }));
    setVerdicts((prev) => ({ ...prev, [qpId]: { status: "pending" } }));

    try {
      const { submissionId } = await submitProblemCode(
        session.session_id,
        qpId,
        code,
        selectedLanguage.language_id
      );

      // Poll for verdict
      let verdict: JudgeVerdict;
      do {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        verdict = await getQuizSubmitStatus(submissionId);
        setVerdicts((prev) => ({ ...prev, [qpId]: verdict }));
      } while (verdict.status === "pending");

      if (verdict.status === "compile_error") {
        toast.error(`Compilation error: ${verdict.error?.errorMessage}`);
      } else if (verdict.status === "completed" && verdict.metrics) {
        const { passedTests = 0, totalTests = 0 } = verdict.metrics;
        if (passedTests === totalTests) {
          toast.success(`All ${totalTests} tests passed!`);
        } else {
          toast.error(`${passedTests}/${totalTests} tests passed`);
        }
        // Update session problem submission status locally
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            problems: prev.problems.map((p) =>
              p.quizProblemId === qpId
                ? {
                    ...p,
                    submission: {
                      submissionId,
                      status: "completed",
                      passedTests: passedTests,
                      totalTests: totalTests,
                      autoScore: 0,
                    },
                  }
                : p
            ),
          };
        });
      }
    } catch {
      toast.error("Failed to submit. Please try again.");
      setVerdicts((prev) => ({ ...prev, [qpId]: { status: "pending" } }));
    } finally {
      setSubmitting((prev) => ({ ...prev, [qpId]: false }));
    }
  };

  // ── Submit whole quiz ─────────────────────────────────────────────────────────
  const handleSubmitQuiz = async (auto = false) => {
    if (!session) return;
    if (auto) toast.warning("Time's up! Submitting quiz automatically.");
    try {
      await submitSession(session.session_id);
      toast.success("Quiz submitted!");
      navigate(`/student/classrooms/${classroomId}/quizes/${quizId}/results`, {
        state: { sessionId: session.session_id },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to submit quiz.";
      // If already submitted, just redirect
      if (msg.includes("already submitted")) {
        navigate(`/student/classrooms/${classroomId}/quizes/${quizId}/results`, {
          state: { sessionId: session.session_id },
        });
      } else {
        toast.error(msg);
      }
    }
  };

  // ── Problem status helpers ────────────────────────────────────────────────────
  const getProblemStatusIcon = (problem: Problem) => {
    const verdict = verdicts[problem.quizProblemId];
    if (submitting[problem.quizProblemId]) {
      return <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />;
    }
    if (verdict?.status === "completed" && verdict.metrics) {
      const { passedTests = 0, totalTests = 0 } = verdict.metrics;
      return passedTests === totalTests
        ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        : <XCircle className="h-3.5 w-3.5 text-amber-400" />;
    }
    if (problem.submission?.status === "completed") {
      const { passedTests, totalTests } = problem.submission;
      return passedTests === totalTests
        ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        : <XCircle className="h-3.5 w-3.5 text-amber-400" />;
    }
    return <div className="h-3.5 w-3.5 rounded-full border border-gray-500" />;
  };

  // ── Render verdict panel ──────────────────────────────────────────────────────
  const renderVerdict = () => {
    if (!activeProblem) return null;
    const verdict = verdicts[activeProblem.quizProblemId];
    const isSubmittingNow = submitting[activeProblem.quizProblemId];

    if (isSubmittingNow || verdict?.status === "pending") {
      return (
        <div className="text-center py-6">
          <div className="animate-spin mb-2 mx-auto h-5 w-5 border-2 border-primary border-r-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Judging your code...</p>
        </div>
      );
    }

    if (verdict?.status === "compile_error" && verdict.error) {
      return (
        <div className="p-4 rounded-md border bg-red-50">
          <h3 className="font-medium text-red-700 mb-2">Compilation Error</h3>
          <div className="bg-red-100 p-3 rounded text-red-900 font-mono text-sm whitespace-pre-wrap">
            {verdict.error.errorMessage}
          </div>
        </div>
      );
    }

    if (verdict?.status === "completed" && verdict.metrics) {
      const { passedTests = 0, totalTests = 0 } = verdict.metrics;
      return (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 font-medium ${passedTests === totalTests ? "text-green-500" : "text-amber-400"}`}>
            {passedTests === totalTests
              ? <CheckCircle className="h-5 w-5" />
              : <AlertTriangle className="h-5 w-5" />}
            {passedTests}/{totalTests} tests passed
          </div>
          {verdict.metrics.averageRuntime !== undefined && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock size={14} /> Avg runtime: {verdict.metrics.averageRuntime}ms
            </p>
          )}
        </div>
      );
    }

    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Submit your code to see results.
      </p>
    );
  };

  // ── Loading / guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-r-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !activeProblem) return null;

  const submittedCount = session.problems.filter(
    (p) => p.submission?.status === "completed" || verdicts[p.quizProblemId]?.status === "completed"
  ).length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Quiz</h1>
          <Badge variant="outline">
            {submittedCount}/{session.problems.length} submitted
          </Badge>
        </div>

        <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timerColor}`}>
          <Clock size={18} />
          {secondsLeft !== null ? formatTime(secondsLeft) : "--:--"}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="gap-2" disabled={session.status !== "in_progress"}>
              <Send size={16} />
              Submit Quiz
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
              <AlertDialogDescription>
                You have submitted {submittedCount} of {session.problems.length} problems.
                Once submitted you cannot make changes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleSubmitQuiz()}>
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Problem sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full flex flex-col border-r overflow-y-auto">
              <div className="p-3 border-b font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Problems
              </div>
              <div className="flex-1 p-2 space-y-1">
                {session.problems.map((problem, idx) => (
                  <button
                    key={problem.quizProblemId}
                    onClick={() => setActiveProblemIndex(idx)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                      idx === activeProblemIndex
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "hover:bg-muted"
                    }`}
                  >
                    {getProblemStatusIcon(problem)}
                    <span className="flex-1 truncate">{problem.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{problem.points}pt</span>
                  </button>
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Problem description + verdict */}
          <ResizablePanel defaultSize={30} minSize={20}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={65} minSize={30}>
                <div className="h-full overflow-y-auto p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold">{activeProblem.title}</h2>
                      <Badge variant="outline">{activeProblem.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {activeProblem.points} points · {activeProblem.publicTestCount} public test{activeProblem.publicTestCount !== 1 ? "s" : ""}
                    </p>
                    <pre className="whitespace-pre-wrap break-words text-sm">
                      {activeProblem.description}
                    </pre>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={35} minSize={20}>
                <div className="h-full flex flex-col">
                  <div className="p-3 border-b border-t font-semibold text-sm flex items-center justify-between">
                    <span>Results</span>
                    {verdicts[activeProblem.quizProblemId]?.status === "completed" && (
                      <Badge
                        variant="outline"
                        className={
                          (verdicts[activeProblem.quizProblemId].metrics?.passedTests ?? 0) ===
                          (verdicts[activeProblem.quizProblemId].metrics?.totalTests ?? 0)
                            ? "text-green-500 border-green-500"
                            : "text-amber-400 border-amber-400"
                        }
                      >
                        {verdicts[activeProblem.quizProblemId].metrics?.passedTests}/
                        {verdicts[activeProblem.quizProblemId].metrics?.totalTests} passed
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {renderVerdict()}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Code editor */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <CodeEditor
                defaultLanguage={languages[0]?.name ?? "python"}
                defaultValue={codes[activeProblem.quizProblemId] ?? ""}
                onRunCode={handleRun}
                onSubmitCode={handleSubmitProblem}
                onChange={handleCodeChange}
                showButtons={true}
                supportedLanguages={languages.map((l) => l.name)}
                onLanguageChange={handleLanguageChange}
                language={selectedLanguage?.name ?? languages[0]?.name ?? "python"}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Problem navigation footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={activeProblemIndex === 0}
          onClick={() => setActiveProblemIndex((i) => i - 1)}
        >
          <ChevronLeft size={16} /> Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Problem {activeProblemIndex + 1} of {session.problems.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={activeProblemIndex === session.problems.length - 1}
          onClick={() => setActiveProblemIndex((i) => i + 1)}
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default QuizTakingPage;
