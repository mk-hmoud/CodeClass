export interface TestCase {
  testCaseId?: number;
  input?: string;
  expectedOutput: string;
  isPublic: boolean;
}

export interface TestResult {
  testCaseId: number | null;
  input: string[];
  actual?: string;
  expectedOutput?: string;
  executionTime?: number;
  status: 'passed' | 'failed' | 'error' | 'timeout' | 'runtime_error';
  errorType?: string;   
  error?: string;         
  errorMessage?: string;
  fullError?: string;
  isPublic?: boolean;
}

export type JudgeStatus = 
  | 'pending'
  | 'compile_error'
  | 'completed'
  | 'system_error'
  | 'syntax_error';

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