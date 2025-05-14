export interface ClassroomStudent {
    email: string;
    name: string;
    enrollment_date: string;
}

export interface Discussion {
  id: number;
  title: string;
  responses: number;
  lastActivity: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
}

export interface Classroom {
  id: number;
  name: string;
  code?: string | null;
  instructor?: string | null;
  instructor_id?: number;
  status?: 'active' | 'archived';
  students?: ClassroomStudent[];
  assignments?: Assignment[];
  announcements?: Announcement[];
  discussions?: Discussion[];
  active?: boolean;
  completion? : number;
  created_at : string;
}

export interface Problem {
  problemId: number;
  instructorId?: number;
  title: string;
  description: string;
  category?: "Fundamentals" | "Algorithms" | "Bug fixes" | "Refactoring" | "Puzzles";
  prerequisites?: string;
  learning_outcomes?: string;
  tags?: string;
  created_at: Date;
  testCases: TestCase[];
}

export interface ProblemCreationData {
  instructorId: number;
  title: string;
  description: string;
  category?: "Fundamentals" | "Algorithms" | "Bug fixes" | "Refactoring" | "Puzzles";
  prerequisites?: string;
  learning_outcomes?: string;
  tags?: string;
  testCases: TestCase[];
}

export interface Assignment {
  assignmentId: number;
  classroomId: number;
  problem: Problem;
  title: string;
  description: string;
  difficulty_level?: "Easy" | "Medium" | "Hard";
  points?: number;
  grading_method: "Manual" | "Automatic" | "Hybrid";
  max_submissions?: number;
  plagiarism_detection: boolean;
  assigned_at: Date;
  publish_date?: Date;
  due_date?: Date;
  languages?: AssignmentLanguage[];
  submissions?: number;
  avgScore?: number;
  completed?: boolean;
}

export interface AssignmentCreationData{
  classroomId: number;
  problemId: number;
  title: string;
  description: string;
  points?: number;
  difficulty_level?: "Easy" | "Medium" | "Hard";
  grading_method: "Manual" | "Automatic" | "Hybrid";
  max_submissions?: number;
  plagiarism_detection: boolean;
  publish_date?: Date;
  due_date?: Date;
  languages?: Array<{
    languageId: number;
    initial_code?: string;
  }>;
}

export interface TestCase{
  testCaseId: number;
  input?: string;
  expectedOutput: string;
  isPublic: boolean;
}

export interface Language {
  language_id: number;
  name: string;
  version?: string;
}

export interface AssignmentLanguage {
  language: Language;
  initial_code?: string;
}

export interface TestResult {
  testCaseId: number | null;
  input: string[];
  actual?: string;
  expectedOutput?: string;
  executionTime?: number;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  errorType?: string;
  errorMessage?: string
  fullError?: string;
  isPublic?: boolean;
}

export type JudgeStatus = 
  | 'pending'
  | 'compile_error'
  | 'completed'
  | 'system_error';

export interface JudgeVerdict {
  status: JudgeStatus;
  error?: {
    errorType: string;
    errorMessage: string;
    fullError: string;
    stackTrace?: string;
  };
  testResults?: TestResult[];
  metrics?: {
    passedTests?: number;
    totalTests?: number;
    averageRuntime?: number;
    memoryUsage?: number;
    privatePassedTests?: number;
    privateTestsTotal?: number;
  };
}

export interface SubmissionRecord {
  submission_id: number;
  assignment_id: number;
  code: string;
}

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
  verdict: JudgeVerdict;
  plagiarismReports: PlagiarismReport[];
  studentName?: string;
  feedback?: string;
}

export interface ClassroomAnalyticsPayload {
  participation: {
    totalStudents: number;
    activeStudents: number;
    activeStudentsPercentage: number;
    submissionRate: number;
    submissionTrend: Array<{
      day: number;
      hour: number;
      count: number;
    }>;
  };

  performance: {
    averageAssignmentScore: number;
    medianAssignmentScore: number;
    scoreDistribution: Array<{
      range: string;
      count: number;
    }>;
    // We don't have a scoreTrend table in schema so we need
    // another table or view, general shape:
    scoreTrend: Array<{
      period: string;
      averageScore: number;
    }>;
  };

  timings: {
    heatmap: Array<{
      day: number;
      hour: number;
      count: number;
    }>;
  };

  quality: {
    plagiarismRate: number;
    averageSimilarity: number;
    maxSimilarity: number;
    runtimeErrorRate: number; 
    languageUsage: Array<{
      languageId: number;
      count: number;
    }>;
  };

  progress: {
    assignmentCompletionRate: number;
    dropOffRate: number;
    improvementDistribution: Array<{
      range: "significant" | "moderate" | "flat" | "declined";
      count: number;
    }>;
  };

  // meta
  classroomId: number;
  snapshotTime: string;
  classroomName: string;
}


export interface AssignmentAnalyticsPayload {
  totalSubmissions: number;
  distinctSubmitters: number;
  averageScore: number;
  medianScore: number;

  scoreDistribution: Array<{
    range: string;
    count: number;
    color: string;
  }>;

  attemptsPerStudent: {
    average: number;
    median: number;
    max: number;
    distribution: Array<{
      attempts: string;
      count: number;
    }>;
  };

  submissionTimeline: Array<{
    day: string;
    hour: string;
    value: number;
  }>;

  averageRuntime: number;

  runtimeDistribution: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  };

  testPassRates: {
    public: number;
    private: number;
  };

  mostMissedTests: Array<{
    id: string;
    description: string;
    failRate: number;
  }>;

  commonErrorPatterns: Array<{
    type: string;
    count: number;
  }>;

  plagiarism: {
    rate: number;
    maxSimilarity: number;
    averageSimilarity: number;
  };

  runtimeErrors: {
    count: number;
    percentage: number;
    types: Array<{
      type: string;
      count: number;
    }>;
  };

  slowestTestCases: Array<{
    id: string;
    description: string;
    avgRuntime: number;
  }>;

  submissionTrend: Array<{
    date: string;
    count: number;
  }>;

  assignmentTitle?: string;
  dueDate?: Date;
  points?: number;
}
