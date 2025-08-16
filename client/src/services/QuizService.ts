import apiClient from './APIclient';
import { QuizCreationData } from '../types/Quiz';

export const createQuiz = async (quizData: QuizCreationData): Promise<any> => {
  try {
    const response = await apiClient.post('/quizzes', quizData);
    return response.data;
  } catch (error) {
    console.error("Error creating quiz:", error);
    throw error;
  }
};

export const deleteQuiz = async (quizId: number): Promise<any> => {
    try {
        const response = await apiClient.delete(`/quizzes/${quizId}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting quiz ${quizId}:`, error);
        throw error;
    }
};
