export interface TestCase {
  testCaseId?: number;
  input?: string;
  expectedOutput: string;
  isPublic: boolean;
}

export interface TestResult {
  testCaseId: number;
  input: string;
  actual: string;
  expectedOutput: string;
  executionTime: number;
  error?: string;
  status?: 'passed' | 'failed' | 'error';
}