import { TestResult } from '../../../types';

export interface Event {
  type: string;
  timestamp: string;
  payload: Record<string, any>;
}

export interface SubmissionCreatedEvent extends Event {
  type: 'SUBMISSION_CREATED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId: number;
  };
}

export interface SubmissionCompletedEvent extends Event {
  type: 'SUBMISSION_COMPLETED';
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId: number;
    score: number;
    passedTests: number;
    totalTests: number;
    publicPassedTests: number;
    publicTotalTests: number;
    privatePassedTests: number;
    privateTotalTests: number;
    averageRuntime: number;
    status: string;
    testResults: TestResult[];
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

export interface PlagiarismDetectedEvent extends Event {
  type: 'PLAGIARISM_DETECTED';
  payload: {
    reportId: number;
    submissionId: number;
    comparedSubmissionId: number;
    similarity: number;
    assignmentId: number;
    classroomId: number;
  };
}

export type ClassroomEvent = 
  | SubmissionCreatedEvent
  | SubmissionCompletedEvent
  | StudentEnrolledEvent
  | PlagiarismDetectedEvent;

export type EventPayload<T extends ClassroomEvent['type']> = 
  Extract<ClassroomEvent, { type: T }>['payload'];