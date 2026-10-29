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

export interface SuggestedTestCase {
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  rationale?: string;
}

/** Whether the server has an AI provider configured (controls the AI button). */
export const getAiStatus = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/problems/ai/status');
    return !!response.data?.data?.enabled;
  } catch {
    return false;
  }
};

export const suggestTestCases = async (params: {
  title: string;
  description: string;
  category?: string;
  outputType?: string;
  count?: number;
  existingInputs?: string[];
}): Promise<SuggestedTestCase[]> => {
  const response = await apiClient.post('/problems/ai/suggest-test-cases', params);
  return response.data.data as SuggestedTestCase[];
};

export const deleteProblem = async (problemId: number): Promise<void> => {
  try {
    await apiClient.delete(`/problems/${problemId}`);
  } catch (error) {
    console.error(`Error deleting problem with ID ${problemId}:`, error);
    throw error;
  }
};
