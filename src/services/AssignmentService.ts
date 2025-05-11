import apiClient from './APIclient';
import { Assignment, AssignmentAnalyticsPayload } from '../types/Assignment';

export const createAssignment = async (assignmentData: any): Promise<Assignment> => {
  try {
    const response = await apiClient.post("/assignments", assignmentData);
    return response.data.data as Assignment;
  } catch (error) {
    console.error("Error creating assignment:", error);
    throw error;
  }
};

export const getAssignmentById = async (
  assignmentId: number
): Promise<any> => {
  try {
    const response = await apiClient.get(`/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return null;
  }
};

export const deleteAssignment = (assignmentId: number) => {
  return apiClient.delete(`/assignments/${assignmentId}`);
};

export const getAssignments = async (): Promise<Assignment[]> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No token found, user is not authenticated.");
      throw new Error("Unauthorized: No token provided");
    }

    const response = await apiClient.get("/assignments/assignments", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return [];
  }
};

export async function getRemainingAttempts(assignmentId: number): Promise<number> {
  const { data } = await apiClient.get<{ data: { remainingAttempts: number } }>(
    `/assignments/${assignmentId}/remaining-attempts`
  );
  return data.data.remainingAttempts;
}

export const getAssignmentAnalytics = async (
  assignmentId: string | number
): Promise<AssignmentAnalyticsPayload> => {
  try {
    const response = await apiClient.get<{
      data: AssignmentAnalyticsPayload;
    }>(`/assignments/${assignmentId}/analytics`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching assignment analytics:", error);
    throw error;
  }
};