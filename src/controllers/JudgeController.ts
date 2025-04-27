import { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import redisClient from '../config/redis';
import { TestCase } from '../types';
import { getAssignmentTestCases } from '../models/ProblemModel';
import { createSubmission } from '../models/SubmissionModel';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [JudgeController.ts] [${functionName}] ${message}`);
};

interface RunCodeRequest {
  code: string;
  language: string;
  testCases: TestCase[];
}

export const runCodeHandler = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { code, language, testCases } = req.body as RunCodeRequest;

  logMessage(
    'runCode',
    `Submission received – lang=${language}, codeLen=${code?.length}, tests=${testCases?.length}`
  );

  if (!code || !language || !Array.isArray(testCases)) {
    logMessage('runCode', `Invalid request – missing parameters`);
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  if (code.length > 10000) {
    logMessage('runCode', `Payload too large – codeLen=${code.length}`);
    res
      .status(400)
      .json({ error: 'Code too long' });
    return;
  }

  if (!redisClient.isReady) {
    logMessage('runCode', 'Redis client not ready, rejecting request');
    res.status(503).json({ error: 'Service temporarily unavailable' });
    return;
  }

  try {
    const jobId = nanoid();
    logMessage('runCode', `Enqueueing job ${jobId}`);

    const mode = "run";
    await redisClient.hSet(`judge:${jobId}`, {
      data: JSON.stringify({ code, language, testCases, mode }),
      createdAt: Date.now().toString(),
    });

    await redisClient.lPush('judge:queue', jobId);

    const duration = Date.now() - startTime;
    logMessage('runCode', `Job ${jobId} enqueued in ${duration}ms`);

    res.status(202).json({
      job_id: jobId,
      status_url: `/api/judge/status/${jobId}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logMessage('runCode', `Failed to enqueue job – ${msg}`);
    res.status(500).json({
      error: 'Failed to queue submission',
      details: process.env.NODE_ENV === 'development' ? msg : undefined,
    });
  }
};

export interface TestResult {
  testCaseId: number;
  input: string;
  actual: string;
  expectedOutput: string;
  executionTime: number;
  error?: string;
  status?: 'passed' | 'failed' | 'error';
}

export const getRunStatusHandler = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  logMessage('getStatus', `Checking status for job ${jobId}`);

  if (!redisClient.isReady) {
    logMessage('getStatus', 'Redis client not ready');
    res.status(503).json({ error: 'Service temporarily unavailable' });
    return;
  }

  try {
    const key = `judge:run:verdict:${jobId}`;
    const raw = await redisClient.get(key);

    if (raw === null) {
      res.status(200).json({
        job_id: jobId,
        status: 'pending',
      });
    } else {
      const verdict: TestResult[] = JSON.parse(raw);
      const passedTests = verdict.filter(t => t.status === 'passed').length;
      const totalTests = verdict.length;
      
      const formattedResults = verdict.map(t => ({
        testCaseId: t.testCaseId,
        input: t.input,
        actual: t.actual,
        expectedOutput: t.expectedOutput,
        error: t.error,
        status: t.status
      }));

      res.status(200).json({
        job_id: jobId,
        status: 'completed',
        result: {
          testResults: formattedResults,
          passedTests,
          totalTests
        }
    });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logMessage('getStatus', `Error fetching verdict: ${msg}`);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};

export const submitHandler = async (req: Request, res: Response): Promise<void> => {
  const functionName = "submit";
  const { assignmentId, code, language } = req.body as {
    assignmentId: number;
    code: string;
    language: string;
  };

  if (!req.user) {
    logMessage(functionName, 'No user in request.');
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (req.user?.role !== "student") {
    logMessage(functionName, `User ${req.user?.id} is not a student`);
    res.status(403).json({ success: false, message: 'Forbidden: Student role required' });
    return;
  }

  const studentId = req.user.role_id as number;

  logMessage(functionName, `Student ${studentId} submitting assignment ${assignmentId}`);

  if (!code || !language || !assignmentId) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  let submissionId: number;
  try {
    submissionId = await createSubmission({
      studentId,
      assignmentId,
      language,
      code,
    });
    logMessage(functionName, `Created submission ${submissionId}`);
  } catch (err) {
    logMessage(functionName, `Error creating submission: ${err}`);
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  if (!redisClient.isReady) {
    logMessage(functionName, "Redis not ready");
    res
      .status(503)
      .json({ error: "Service temporarily unavailable" });
    return;
  }

  let testCases: TestCase[];
  try {
    testCases = await getAssignmentTestCases(assignmentId);
    if (testCases.length === 0) {
      throw new Error("No test cases found for assignment");
    }
  } catch (err) {
    logMessage(functionName, `Error fetching test cases: ${err}`);
    res.status(500).json({ error: "Failed to load test cases" });
    return;
  }

  try {
    await redisClient.hSet(`judge:${submissionId}`, {
      data: JSON.stringify({ code, language, testCases, mode: "submit"}),
      createdAt: Date.now().toString(),
    });
    await redisClient.lPush("judge:queue", submissionId.toString());
    logMessage(functionName, `Enqueued job ${submissionId} for submission ${submissionId}`);
  } catch (err) {
    logMessage(functionName, `Error enqueuing job: ${err}`);
    res.status(500).json({ error: "Failed to queue grading job" });
    return;
  }

  res.status(202).json({
    submissionId,
    job_id: submissionId,
    status_url: `/api/judge/status/${submissionId}`,
  });
}

export const getSubmitStatusHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { jobId } = req.params;
  logMessage("getSubmitStatus", `Checking submit status for job ${jobId}`);

  if (!redisClient.isReady) {
    logMessage("getSubmitStatus", "Redis client not ready");
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  try {
    const key = `judge:submit:verdict:${jobId}`;
    const raw = await redisClient.get(key);

    if (raw === null) {
      res.status(200).json({
        job_id: jobId,
        status: "pending",
      });
      return;
    }

    const verdict: TestResult[] = JSON.parse(raw);
    const passedTests = verdict.filter((t) => t.status === "passed").length;
    const totalTests = verdict.length;

    // separate public vs private

    res.status(200).json({
      job_id: jobId,
      status: "completed",
      result: {
        testResults: verdict.map((t) => ({
          testCaseId: t.testCaseId,
          input: t.input,
          actual: t.actual,
          expectedOutput: t.expectedOutput,
          executionTime: t.executionTime,
          error: t.error,
          status: t.status,
        })),
        passedTests,
        totalTests,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logMessage("getSubmitStatus", `Error fetching submit verdict: ${msg}`);
    res.status(500).json({ error: "Failed to fetch submit status" });
  }
};