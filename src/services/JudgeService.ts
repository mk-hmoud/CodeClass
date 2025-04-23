import apiClient from "./APIclient";
import { TestCase } from "@/types/TestCase";


export const runCode = async (
    code: string,
    language: string,
    testCases: TestCase[]
  ): Promise<void> => {
    try {
      const response = await apiClient.post('/judge/run', { code, language, testCases});
      return;
    } catch (error) {
      console.error('Error running code:', error);
      throw error;
    }
  };