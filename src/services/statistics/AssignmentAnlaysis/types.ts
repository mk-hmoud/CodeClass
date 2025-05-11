import { TestResult } from '../../../types'

export interface ScoreDistributionBucket {
  bucketStart: number;
  bucketEnd: number;
  count: number;
}
  
export interface AttemptsDistribution {
  avgAttempts: number;
  medianAttempts: number;
  maxAttempts: number;
}
  
export interface RuntimeDistribution {
  minRuntimeMs: number | null;
  percentile25Ms: number | null;
  medianRuntimeMs: number | null;
  percentile75Ms: number | null;
  maxRuntimeMs: number | null;
}
  
export interface TestCaseStats {
  testCaseId: number;
  failureRate: number;
  avgRuntimeMs: number | null;
  isPublic: boolean;
}
  
export interface ErrorPattern {
  errorType: string;
  errorMessage: string;
  occurrenceCount: number;
}
  
export interface SubmissionTimelineEntry {
  day: number;  // 0-6 starts from sunday
  hour: number;
  count: number;
}
  
export interface SubmissionTrendEntry {
  date: string;
  count: number;
}
  
export interface AssignmentStatistics {
  assignmentId: number;
  snapshotTime: string;
  totalSubmissions: number;
  distinctSubmitters: number;
  averageScore: number | null;
  medianScore: number | null;
  scoreDistribution: ScoreDistributionBucket[];
  attemptsDistribution: AttemptsDistribution;
  submissionTimeline: SubmissionTimelineEntry[];
  averageRuntimeMs: number | null;
  runtimeDistribution: RuntimeDistribution;
  publicTestPassRate: number | null;
  privateTestPassRate: number | null;
  mostFrequentlyMissedTestCases: TestCaseStats[];
  topSlowestTestCases: TestCaseStats[];
  commonErrorPatterns: ErrorPattern[];
  submissionTrend: SubmissionTrendEntry[];
  plagiarismRate: number | null;
  maxSimilarity: number | null;
  avgSimilarity: number | null;
  runtimeErrorRate: number | null;
}

export type StatisticsEventType = 
  | 'SUBMISSION_CREATED'
  | 'SUBMISSION_COMPLETED'
  | 'PLAGIARISM_DETECTED'
  | 'STATISTICS_CALCULATED';

export interface StatisticsEvent {
  type: StatisticsEventType;
  payload: any;
  timestamp: string;
}

export interface SubmissionCreatedEvent extends StatisticsEvent {
  type: 'SUBMISSION_CREATED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId: number;
  };
}

export interface SubmissionCompletedEvent extends StatisticsEvent {
  type: 'SUBMISSION_COMPLETED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId: number;
    score: number | null;
    passedTests: number;
    totalTests: number;
    publicPassedTests?: number;
    publicTotalTests?: number;
    privatePassedTests?: number;
    privateTotalTests?: number;
    averageRuntime?: number;
    status: string;
    testResults: TestResult[];
  };
}

export interface PlagiarismDetectedEvent extends StatisticsEvent {
  type: 'PLAGIARISM_DETECTED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId: number;
    comparedSubmissionId: number;
    similarityScore: number;
  };
}

export interface StatisticsCalculatedEvent extends StatisticsEvent {
  type: 'STATISTICS_CALCULATED';
  payload: {
    assignmentId: number;
    statistics: AssignmentStatistics;
  };
}