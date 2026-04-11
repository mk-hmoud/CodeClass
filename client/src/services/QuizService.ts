import apiClient from './APIclient';
import { QuizCreationData, QuizUpdateData } from '../types/Quiz';

// ── Instructor: quiz CRUD ─────────────────────────────────────────────────────

export const createQuiz = async (quizData: QuizCreationData): Promise<any> => {
  const response = await apiClient.post('/quizzes', quizData);
  return response.data;
};

export const getQuizzesByClassroom = async (classroomId: number): Promise<any[]> => {
  const response = await apiClient.get(`/quizzes/classroom/${classroomId}`);
  return response.data.data;
};

export const getQuizById = async (quizId: number): Promise<any> => {
  const response = await apiClient.get(`/quizzes/${quizId}`);
  return response.data.data;
};

export const updateQuiz = async (quizId: number, data: QuizUpdateData): Promise<any> => {
  const response = await apiClient.put(`/quizzes/${quizId}`, data);
  return response.data;
};

export const togglePublishQuiz = async (quizId: number): Promise<{ isPublished: boolean }> => {
  const response = await apiClient.patch(`/quizzes/${quizId}/publish`);
  return response.data.data;
};

export const deleteQuiz = async (quizId: number): Promise<any> => {
  const response = await apiClient.delete(`/quizzes/${quizId}`);
  return response.data;
};

// ── Instructor: results ───────────────────────────────────────────────────────

export const getQuizResults = async (quizId: number): Promise<any[]> => {
  const response = await apiClient.get(`/quizzes/${quizId}/results`);
  return response.data.data;
};

// ── Student: sessions ─────────────────────────────────────────────────────────

export const startSession = async (quizId: number): Promise<any> => {
  const response = await apiClient.post(`/quizzes/${quizId}/sessions`);
  return response.data.data;
};

export const getSession = async (sessionId: number): Promise<any> => {
  const response = await apiClient.get(`/quizzes/sessions/${sessionId}`);
  return response.data.data;
};

export const submitSession = async (sessionId: number): Promise<any> => {
  const response = await apiClient.post(`/quizzes/sessions/${sessionId}/submit`);
  return response.data;
};

export const submitProblemCode = async (
  sessionId: number,
  quizProblemId: number,
  code: string,
  languageId: number
): Promise<{ submissionId: number; jobId: number }> => {
  const response = await apiClient.post(
    `/quizzes/sessions/${sessionId}/problems/${quizProblemId}/submit`,
    { code, languageId }
  );
  return response.data.data;
};

export const getQuizSubmitStatus = async (submissionId: number): Promise<any> => {
  const response = await apiClient.get(`/quizzes/submissions/${submissionId}/status`);
  return response.data;
};

export const getSessionResults = async (sessionId: number): Promise<any> => {
  const response = await apiClient.get(`/quizzes/sessions/${sessionId}/results`);
  return response.data.data;
};
