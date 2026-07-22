import apiClient from './APIclient';
import { LabSession, AttendanceReportRow, AttendanceStatus } from '../types/Attendance';

export const findOrCreateSession = async (
  classroomId: number,
  sessionDate: string,
  groupId?: number | null
): Promise<LabSession> => {
  try {
    const response = await apiClient.post('/attendance/sessions', {
      classroomId,
      groupId: groupId ?? null,
      sessionDate,
    });
    return response.data.data as LabSession;
  } catch (error) {
    console.error("Error loading session:", error);
    throw error;
  }
};

export const saveAttendance = async (
  sessionId: number,
  records: Array<{ studentId: number; status: AttendanceStatus }>
): Promise<void> => {
  try {
    await apiClient.put(`/attendance/sessions/${sessionId}`, { records });
  } catch (error) {
    console.error("Error saving attendance:", error);
    throw error;
  }
};

export const listSessions = async (
  classroomId: number,
  groupId?: number
): Promise<LabSession[]> => {
  try {
    const response = await apiClient.get(`/attendance/classrooms/${classroomId}/sessions`, {
      params: groupId ? { groupId } : undefined,
    });
    return response.data.data as LabSession[];
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return [];
  }
};

export const getAttendanceReport = async (
  assignmentId: number,
  sessionId: number
): Promise<AttendanceReportRow[]> => {
  try {
    const response = await apiClient.get(`/attendance/report/${assignmentId}`, {
      params: { sessionId },
    });
    return response.data.data as AttendanceReportRow[];
  } catch (error) {
    console.error("Failed to fetch attendance report:", error);
    return [];
  }
};
