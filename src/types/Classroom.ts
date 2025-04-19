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
    students_num?: number;
    students?: ClassroomStudent[];
    assignments_num?: number;
    assignments?: Assignment[];
    announcements?: Announcement[];
    discussions?: Discussion[];
    active?: boolean;
    completion? : number;
    created_at : string;
}