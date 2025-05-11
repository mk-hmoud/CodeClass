export interface SubmissionResult {
    testCaseId: number;
    passed: boolean;
    actualOutput: string | null;
    executionTimeMs: number | null;
    memoryUsageKb: number | null;
    errorMessage: string | null;
  }
  
  export interface PlagiarismReport {
    reportId: number;
    submissionId: number;
    comparedSubmission: number;
    similarity: number;
    checkedAt: string;
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
    results: SubmissionResult[];
    plagiarismReports: PlagiarismReport[];
    studentName?: string;
    feedback?: string;
  }
  