import { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import redisClient from '../config/redis';
import { TestCase } from '../types';

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

    await redisClient.hSet(`judge:${jobId}`, {
      data: JSON.stringify({ code, language, testCases }),
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

export const getStatusHandler = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  logMessage('getStatus', `Checking status for job ${jobId}`);

  if (!redisClient.isReady) {
    logMessage('getStatus', 'Redis client not ready');
    res.status(503).json({ error: 'Service temporarily unavailable' });
    return;
  }

  try {
    const key = `judge:verdict:${jobId}`;
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