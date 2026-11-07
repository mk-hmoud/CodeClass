import { JudgeVerdict } from "./TestCase";

export interface SubmissionResult {
    testCaseId: number;
    passed: boolean;
    actualOutput: string | null;
    executionTimeMs: number | null;
    memoryUsageKb: number | null;
    errorMessage: string | null;
  }
  
  /** What the server confirmed after a manual grade, for patching a list row. */
  export interface GradedSubmission {
    submissionId: number;
    finalScore: number;
    manualScore: number;
    gradingStatus: 'pending' | 'system graded' | 'graded';
    feedback: string;
  }

  export interface FullSubmission {
    submissionId: number;
    studentId: number;
    assignmentId: number;
    languageId: number;
    code: string;
    submittedAt: string;
    passedTests: number | null;
    totalTests: number | null;
    gradingStatus: 'pending' | 'system graded' | 'graded';
    autoScore?: number | null;
    manualScore?: number | null;
    finalScore?: number | null;
    gradesReleased?: boolean;
    verdict: JudgeVerdict;
    studentName: string;
    feedback?: string;
  }
  