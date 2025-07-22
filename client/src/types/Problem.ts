import { TestCase } from "./TestCase";

export interface Problem {
  problemId: number;
  instructor: string; //?
  title: string;
  description: string;
  category?:
    | "Fundamentals"
    | "Algorithms"
    | "Bug fixes"
    | "Refactoring"
    | "Puzzles";
  prerequisites?: string;
  learning_outcomes?: string;
  tags?: string;
  createdAt: Date;
  testCases: TestCase[];
}
