import { z } from "zod";
import { Problem } from "./Problem";


export interface QuizProblem {
  problemId: number;
  points: number;
  problemOrder: number;
  problemDetails?: Problem; 
}

export interface Quiz {
  quizId: number;
  classroomId: number;
  instructorId: number;
  title: string;
  description?: string;
  time_limit_minutes: number;
  startDate?: Date | null;
  endDate?: Date | null;
  shuffleProblems: boolean;
  isPublished: boolean;
  createdAt: Date;
  problems: QuizProblem[];
}


export interface QuizCreationData {
  classroomId: number;
  title: string;
  description?: string | null;
  time_limit_minutes: number;
  startDate?: Date | null;
  endDate?: Date | null;
  shuffleProblems: boolean;
  problems: Array<{
    problemId: number;
    points: number;
    problemOrder: number;
  }>;
}

export interface QuizSession {
    session_id: number;
    quiz_id: number;
    student_id: number;
    start_time: Date;
    end_time?: Date | null;
    status: 'in_progress' | 'submitted' | 'graded';
    final_score?: number | null;
}

export interface QuizSubmission {
    submission_id: number;
    session_id: number;
    quiz_problem_id: number;
    language_id: number;
    code: string;
    submitted_at: Date;
    status: 'queued' | 'running' | 'completed' | 'error';
    passed_tests?: number;
    total_tests?: number;
    auto_score?: number;
}

export const quizFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  description: z.string().optional(),
  time_limit_minutes: z.coerce.number().min(5, "Time limit must be at least 5 minutes."),
  startDate: z.date().optional(),
  startTime: z.string().optional(),
  endDate: z.date().optional(),
  endTime: z.string().optional(),
  shuffleProblems: z.boolean().default(false),
  problems: z.array(z.object({
    problemId: z.number(),
    points: z.coerce.number().min(0, "Points cannot be negative.")
  })).min(1, "You must select at least one problem for the quiz."),
});

export type QuizFormValues = z.infer<typeof quizFormSchema>;
