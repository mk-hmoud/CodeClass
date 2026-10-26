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
  outputType?: "text" | "image";
  // Systems problems
  runtime?: "standard" | "systems";
  buildCommand?: string;
  entrypoint?: string;
  files?: ProblemFile[];
}

export interface ProblemFile {
  path: string;
  content: string;
  role: "template" | "readonly" | "hidden";
}
