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
