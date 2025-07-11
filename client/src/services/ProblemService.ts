import apiClient from './APIclient';
import { Problem } from '../types/Problem';

export const createProblem = async (problemData: any): Promise<Problem> => {
  try {
    const response = await apiClient.post('/problems', problemData);
    return response.data.data as Problem;
  } catch (error) {
    console.error("Error creating problem:", error);
    throw error;
  }
};

export const getProblemById = async (problemId: number): Promise<Problem> => {
  try {
    const response = await apiClient.get(`/problems/${problemId}`);
    return response.data.data as Problem;
  } catch (error) {
    console.error(`Error fetching problem with ID ${problemId}:`, error);
    throw error;
  }
};

export const getProblems = async (): Promise<Problem[]> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No token found, user is not authenticated.");
      throw new Error("Unauthorized: No token provided");
    }
    const response = await apiClient.get('/problems');
    return response.data.data as Problem[];
  } catch (error) {
    console.error("Failed to fetch problems:", error);
    return [];
  }
};

export const updateProblem = async (problem: Problem): Promise<Problem> => {
  try {
    const response = await apiClient.put(`/problems/${problem.problemId}`, problem);
    return response.data.data as Problem;
  } catch (error) {
    console.error("Error updating problem:", error);
    throw error;
  }
};

export const deleteProblem = async (problemId: number): Promise<void> => {
  try {
    await apiClient.delete(`/problems/${problemId}`);
  } catch (error) {
    console.error(`Error deleting problem with ID ${problemId}:`, error);
    throw error;
  }
};
