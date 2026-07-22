export type AttendanceStatus = "present" | "absent" | "excused";

export interface LabSessionRosterEntry {
  studentId: number;
  name: string;
  email: string;
  status: AttendanceStatus | null;
}

export interface LabSession {
  sessionId: number;
  classroomId: number;
  groupId: number | null;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  created_at?: Date;
  roster?: LabSessionRosterEntry[];
}

export interface AttendanceReportRow {
  submissionId: number;
  studentId: number;
  firstName: string;
  lastName: string;
  email: string;
  submittedAt: string;
  attendanceStatus: AttendanceStatus | null;
}
