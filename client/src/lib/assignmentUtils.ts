import { z } from "zod";

export const LANGUAGE_LABELS: Record<string, string> = {
  cpp: "C++",
  c: "C",
  python: "Python",
  javascript: "Javascript",
  typescript: "Typescript",
};

export const languageDefaultCode: Record<string, string> = {
  python: `# Your code here\n\ndef solution():\n    # Implement your solution here\n    pass\n\n# Test your solution\nprint(solution())`,
  javascript: `// Your code here\n\nfunction solution() {\n    // Implement your solution here\n    return null;\n}\n\n// Test your solution\nconsole.log(solution());`,
  typescript: `// Your code here\n\nfunction solution(): any {\n    // Implement your solution here\n    return null;\n}\n\n// Test your solution\nconsole.log(solution());`,
  cpp: `#include <iostream>\n\nusing namespace std;\n\n// Implement your solution here\nint solution() { \n    return 0; \n}\n\nint main() { \n    cout << solution() << endl; \n    return 0; \n}`,
  c: `#include <stdio.h>\n\nint solution() {     \n    return 0; \n}\n\nint main() { \n    printf("%d\\n", solution()); \n    return 0; \n}`,
};

export const formSchema = z.object({
  problemId: z.string().min(1, "You must select a problem"),
  title: z.string().optional(),
  description: z.string().optional(),
  difficulty_level: z.enum(['Easy', 'Medium', 'Hard']),
  points: z.coerce.number().min(1, "Points must be at least 1"),
  grading_method: z.enum(['Manual', 'Automatic', 'Hybrid']),
  enable_max_submissions: z.boolean().default(false),
  max_submissions: z.coerce.number().min(1).optional(),
  plagiarism_detection: z.boolean().default(false),
  publish_immediately: z.boolean().default(false),
  publish_date: z.date(),
  publish_time: z.string(),
  due_date: z.date(),
  due_time: z.string(),
  programming_languages: z.array(z.string()).min(1, "At least one programming language is required"),
});

export type FormValues = z.infer<typeof formSchema>;

export interface TestCase {
  input: string;
  expectedOutput: string;
  isPublic: boolean;
}