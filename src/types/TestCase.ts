export interface TestCase {
  testCaseId?: number;
  input?: string;
  expectedOutput: string;
  isPublic: boolean;
}