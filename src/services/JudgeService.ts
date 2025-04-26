import apiClient from "./APIclient";
import { TestCase, TestResult } from "@/types/TestCase";

export interface RunCodeResponse {
  job_id: string;
  status_url: string;
}

export const runCode = async (
  code: string,
  language: string,
  testCases: TestCase[]
): Promise<RunCodeResponse> => {
  try {
    const { data } = await apiClient.post<RunCodeResponse>(
      "/judge/run",
      { code, language, testCases }
    );
    return data;
  } catch (error) {
    console.error("Error running code:", error);
    throw error;
  }
};

export interface StatusResponse {
  job_id: string;
  status: "queued" | "running" | "complete" | "error";
  result?: {
    testResults: TestResult[];
    totalTests: number;
    passedTests: number;
  };
}

export const getStatus = async (
  jobId: string
): Promise<StatusResponse> => {
  try {
    const { data } = await apiClient.get<StatusResponse>(
      `/judge/status/${jobId}`
    );
    return data;
  } catch (error) {
    console.error("Error fetching status:", error);
    throw error;
  }
};