import { TestResult } from '../../types';

export interface Event {
  type: EventType;
  timestamp: string;
  payload: Record<string, any>;
}

export type EventType =
  | 'SUBMISSION_CREATED'
  | 'SUBMISSION_COMPLETED'
  | 'PLAGIARISM_DETECTED'
  | 'STATISTICS_CALCULATED'
  | 'GRADE_UPDATED'
  | 'STUDENT_ENROLLED';

export interface SubmissionCreatedEvent extends Event {
  type: 'SUBMISSION_CREATED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId: number;
    classroomId?: number;
  };
}

export interface SubmissionCompletedEvent extends Event {
  type: 'SUBMISSION_COMPLETED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId: number;
    classroomId?: number;
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

export interface PlagiarismDetectedEvent extends Event {
  type: 'PLAGIARISM_DETECTED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId?: number; 
    comparedSubmissionId: number;
    similarityScore: number; 
    reportId?: number; 
    classroomId?: number; 
  };
}

export interface StatisticsCalculatedEvent extends Event {
  type: 'STATISTICS_CALCULATED';
  payload: {
    assignmentId: number;
    classroomId?: number;
    statistics: AssignmentStatistics;
  };
}

export interface GradeUpdatedEvent extends Event {
  type: 'GRADE_UPDATED';
  payload: {
    assignmentId: number;
    submissionId: number;
    finalScore: number;
    classroomId?: number; 
  };
}

export interface StudentEnrolledEvent extends Event {
  type: 'STUDENT_ENROLLED';
  payload: {
    enrollmentId: number;
    classroomId: number;
    studentId: number;
  };
}

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
  day: number;
  hour: number;
  count: number;
}

export interface SubmissionTrendEntry {
  date: string;
  count: number;
}

export interface AssignmentStatistics {
  assignmentId: number;
  classroomId?: number;
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

export type SystemEvent =
  | SubmissionCreatedEvent
  | SubmissionCompletedEvent
  | PlagiarismDetectedEvent
  | StatisticsCalculatedEvent
  | GradeUpdatedEvent
  | StudentEnrolledEvent;

export type EventPayload<T extends EventType> = Extract<SystemEvent, { type: T }>['payload'];