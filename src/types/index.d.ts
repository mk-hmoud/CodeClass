export interface ClassroomStudent {
    email: string;
    name: string;
    enrollment_date: string;
  }
  
  export interface Discussion {
    id: number;
    title: string;
    responses: number;
    lastActivity: string;
  }
  
  export interface Announcement {
    id: number;
    title: string;
    content: string;
    date: string;
  }
  
  export interface Classroom {
    id: number;
    name: string;
    code?: string | null;
    instructor?: string | null;
    instructor_id?: number;
    students?: ClassroomStudent[];
    assignments?: Assignment[];
    announcements?: Announcement[];
    discussions?: Discussion[];
    active?: boolean;
    completion? : number;
    created_at : string;
  }
  
  export interface Problem {
    problemId: number;
    instructorId?: number;
    title: string;
    description: string;
    category?: "Fundamentals" | "Algorithms" | "Bug fixes" | "Refactoring" | "Puzzles";
    prerequisites?: string;
    learning_outcomes?: string;
    tags?: string;
    created_at: Date;
    testCases: TestCase[];
  }

  export interface ProblemCreationData {
    instructorId: number;
    title: string;
    description: string;
    category?: "Fundamentals" | "Algorithms" | "Bug fixes" | "Refactoring" | "Puzzles";
    prerequisites?: string;
    learning_outcomes?: string;
    tags?: string;
    testCases: TestCase[];
  }

  export interface Assignment {
    assignmentId: number;
    classroomId: number;
    problem: Problem;
    title: string;
    description: string;
    difficulty_level?: "Easy" | "Medium" | "Hard";
    points?: number;
    grading_method: "Manual" | "Automatic" | "Hybrid";
    submission_attempts?: number;
    plagiarism_detection: boolean;
    assigned_at: Date;
    publish_date?: Date;
    due_date?: Date;
    languages?: AssignmentLanguage[];
    submissions?: number;
    avgScore?: number;
    completed?: boolean;
  }

  export interface AssignmentCreationData{
    classroomId: number;
    problemId: number;
    points?: number;
    difficulty_level?: "Easy" | "Medium" | "Hard";
    grading_method: "Manual" | "Automatic" | "Hybrid";
    submission_attempts?: number;
    plagiarism_detection: boolean;
    publish_date?: Date;
    due_date?: Date;
    languages?: Array<{
      languageId: number;
      initial_code?: string;
    }>;
  }
  
  export interface TestCase{
    testCaseId: number;
    input?: string;
    expectedOutput: string;
    isPublic: boolean;
  }

  export interface Language {
    language_id: number;
    name: string;
    version?: string;
  }

  export interface AssignmentLanguage {
    language: Language;
    initial_code?: string;
  }