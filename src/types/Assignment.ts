import { Problem } from "./Problem"
import { AssignmentLanguage } from "./Language";

export interface Assignment {
  assignmentId: number;
  classroomId: number;
  problem: Problem;
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
}


export interface AssignmentCreationData {
  classroomId: number;
  problemId: number;
  title?: string;
  description?: string;
  difficulty_level: "Easy" | "Medium" | "Hard";
  points?: number;
  grading_method: "Manual" | "Automatic" | "Hybrid";
  max_submissions?: number;
  plagiarism_detection: boolean;
  publish_date?: Date;
  due_date?: Date;
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
