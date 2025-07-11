import apiClient from "./APIclient";
import { TestCase, TestResult, JudgeVerdict } from "@/types/TestCase";

export interface JudgeResponse {
  job_id: string;
  status_url: string;
}

export const runCode = async (
  code: string,
  language: string,
  testCases: TestCase[]
): Promise<JudgeResponse> => {
  try {
    const { data } = await apiClient.post<JudgeResponse>(
      "/judge/run",
      { code, language, testCases }
    );
    return data;
  } catch (error) {
    console.error("Error running code:", error);
    throw error;
  }
};

export interface SubmissionResult {
  testReults: TestResult[];
  passedTests: number;
  totalTests: number;
  score?: number;

  publicPassed?: number;
  publicTotal?: number;
  privatePassed?: number;
  privateTotal?: number;
}

export interface StatusResponse {
  job_id: string;
  status: "queued" | "running" | "complete" | "error";
  result?: SubmissionResult;
}

export const getRunStatus = async (
  jobId: string
): Promise<JudgeVerdict> => {
  try {
    const { data } = await apiClient.get<JudgeVerdict>(
      `/judge/status/run/${jobId}`
    );
    return data;
  } catch (error) {
    console.error("Error fetching status:", error);
    throw error;
  }
};

export const submit = async (
  assignmentId: number,
  code: string,
  language: string,
): Promise<JudgeResponse> => {
  try {
    const { data } = await apiClient.post<JudgeResponse>(
      "/judge/submit",
      { assignmentId, code, language}
    );
    return data;
  } catch (error) {
    console.error("Error running code:", error);
    throw error;
  }
};

export const getSubmitStatus = async (
  jobId: string
): Promise<JudgeVerdict> => {
  try {
    const { data } = await apiClient.get<JudgeVerdict>(
      `/judge/status/submit/${jobId}`
    );
    return data;
  } catch (error) {
    console.error("Error fetching status:", error);
    throw error;
  }
};