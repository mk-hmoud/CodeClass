import apiClient from './APIclient';

export interface GradeUpdatePayload {
    submissionId: number;
    manualScore: number;
    feedback?: string | null;
  }
  
  export interface GradeUpdateResponse {
    submissionId: number;
    finalScore: number;
    gradingStatus: string;
  }
  
  export const updateManualGrade = async (
    payload: GradeUpdatePayload
  ): Promise<GradeUpdateResponse> => {
    try {
      const { data } = await apiClient.post<GradeUpdateResponse>(
        `/submissions/${payload.submissionId}/grade`,
        payload
      );
      return data;
    } catch (error) {
      console.error("Grade update failed:", error);
      throw error;
    }
  };