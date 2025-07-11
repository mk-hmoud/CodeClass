import apiClient from './APIclient';
import { PlagiarismReport } from '../types/Submission';



export const getAssignmentPlagiarismReports = async (assignmentId: string): Promise<PlagiarismReport[]> => {
  try {
    const response = await apiClient.get(`/assignments/${assignmentId}/plagiarism`);
    return response.data.data.reports as PlagiarismReport[];
  } catch (error) {
    console.error("Error fetching plagiarism reports:", error);
    throw error;
  }
};
