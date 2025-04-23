export interface TestCase {
  testCaseId?: number;
  input?: string;
  expectedOutput: string;
  isPublic: boolean;
}

export interface TestResult {
  test_case_id: number;
  passed: boolean;
  output: string;
  executionTime: number;
}