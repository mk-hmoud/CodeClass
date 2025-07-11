import { Assignment } from "./Assignment"

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
    instructor?: string;
    status?: 'active' | 'archived';
    students_num?: number;
    students?: ClassroomStudent[];
    assignments?: Assignment[];
    totalAssignments: number;
    completedAssignments?:   number;
    uncompletedAssignments?: number;
    announcements?: Announcement[];
    discussions?: Discussion[];
    active?: boolean;
    completion? : number;
    created_at : string;
}

export interface ClassroomAnalyticsPayload {
    participation: {
      totalStudents: number;
      activeStudents: number;
      activeStudentsPercentage: number;
      submissionRate: number;
      submissionTrend: Array<{
        day: number;
        hour: number;
        count: number;
      }>;
    };
  
    performance: {
      averageAssignmentScore: number;
      medianAssignmentScore: number;
      scoreDistribution: Array<{
        range: string;
        count: number;
      }>;
      // We don't have a built‑in SQL table for “scoreTrend” so you’d need
      // another table or view—but here’s the shape:
      scoreTrend: Array<{
        // for example, month name or ISO date string
        period: string;
        averageScore: number;
      }>;
    };
  
    timings: {
      heatmap: Array<{
        day: number;
        hour: number;
        count: number;
      }>;
    };
  
    quality: {
      plagiarismRate: number;
      averageSimilarity: number;
      maxSimilarity: number;
      runtimeErrorRate: number; 
      languageUsage: Array<{
        languageId: number;
        count: number;
      }>;
    };
  
    progress: {
      assignmentCompletionRate: number;
      dropOffRate: number;
      improvementDistribution: Array<{
        range: "significant" | "moderate" | "flat" | "declined";
        count: number;
      }>;
    };
  
    // meta
    classroomId: number;
    snapshotTime: string;
    classroomName: string;
  }
  