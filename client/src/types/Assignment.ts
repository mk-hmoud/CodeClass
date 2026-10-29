import { Problem } from "./Problem"
import { AssignmentLanguage } from "./Language";

/** One problem's membership in a multi-problem assignment. */
export interface AssignmentProblem {
  problem: Problem;
  points: number;
  position: number;
  languages?: AssignmentLanguage[];
}

export interface Assignment {
  assignmentId: number;
  classroomId: number;
  /** Primary problem (problems[0].problem). Kept for single-problem callers. */
  problem: Problem;
  /** Every problem in the assignment, ordered by position. */
  problems?: AssignmentProblem[];
  title: string;
  description: string;
  difficulty_level: "Easy" | "Medium" | "Hard";
  points?: number;
  grading_method: "Manual" | "Automatic" | "Hybrid";
  max_submissions?: number;
  plagiarism_detection: boolean;
  assigned_at: Date;
  publishDate?: Date;
  dueDate?: Date;
  languages?: AssignmentLanguage[];
  submissions?: number;
  avgScore?: number;
  completed?: boolean;
  status?: "active" | "expired";
  submitted?: boolean;
  finalScore?: number;
  grade_release_mode?: "immediate" | "on_deadline" | "manual";
  grades_released_at?: Date;
}


export interface AssignmentCreationData {
  classroomId: number;
  /** Primary problem; for multi-problem it must equal problems[0].problemId. */
  problemId: number;
  /** Full ordered problem set. Omit for a single-problem assignment. */
  problems?: Array<{
    problemId: number;
    points?: number;
    position?: number;
    languages?: Array<{ languageId: number; initial_code?: string }>;
    /** @deprecated single library — superseded by libraryIds. */
    libraryId?: number | null;
    /** Helper-code libraries linked to this problem, in link order. */
    libraryIds?: number[];
  }>;
  title?: string;
  description?: string;
  difficulty_level: "Easy" | "Medium" | "Hard";
  points?: number;
  grading_method: "Manual" | "Automatic" | "Hybrid";
  max_submissions?: number;
  plagiarism_detection: boolean;
  publish_date?: Date | string;
  due_date?: Date | string;
  grade_release_mode?: "immediate" | "on_deadline" | "manual";
  libraryId?: number;
  groupId?: number;
  testCaseOverrides?: Array<{
    testCaseId: number;
    input?: string;
    expectedOutput?: string;
  }>;
  languages: Array<{
    languageId: number;
    initial_code?: string;
  }>;
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
