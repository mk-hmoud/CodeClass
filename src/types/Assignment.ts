import {Problem} from "./Problem"

export interface Assignment {
  assignmentId: number;
  classroomId: number;
  problem: Problem;
  title: string;
  description: string;
  difficulty_level: "Easy" | "Medium" | "Hard";
  points?: number;
  grading_method: "Manual" | "Automatic" | "Hybrid";
  submission_attempts?: number;
  plagiarism_detection: boolean;
  assigned_at: Date;
  publish_date?: Date;
  due_date?: Date;
  languages?: Array<{
    pairId: number;
    assignmentId: number;
    languageId: number;
    initial_code?: string;
    name?: string;
    version?: string;
  }>;
  submissions?: number;
  avgScore?: number;
  completed?: boolean;
}


export interface AssignmentCreationData {
  classroomId: number;
  problemId: number;
  title?: string;
  description?: string;
  difficulty_level: "Easy" | "Medium" | "Hard";
  points?: number;
  grading_method: "Manual" | "Automatic" | "Hybrid";
  submission_attempts?: number;
  plagiarism_detection: boolean;
  publish_date?: Date;
  due_date?: Date;
  languages: Array<{
    languageId: number;
    initial_code?: string;
  }>;
}