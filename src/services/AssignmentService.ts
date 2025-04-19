import apiClient from './APIclient';
import { Assignment } from '../types/Assignment';

export const createAssignment = async (assignmentData: any): Promise<Assignment> => {
  try {
    const response = await apiClient.post("/assignments", assignmentData);
    return response.data.data as Assignment;
  } catch (error) {
    console.error("Error creating assignment:", error);
    throw error;
  }
};

export const getAssignmentById = (assignmentId: number) => {
  return apiClient.get(`/assignments/${assignmentId}`);
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