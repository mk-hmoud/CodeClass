import { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import redisClient from '../config/redis';
import { JudgeVerdict, TestCase, TestResult } from '../types';
import { getAssignmentTestCases } from '../models/ProblemModel';
import { createSubmission, getSubmissionById, updateSubmissionStatus } from '../models/SubmissionModel';
import { runPlagiarismCheck } from './PlagiarismController';
import { statisticsEventEmitter } from '../services/statistics/AssignmentAnlaysis/emitter';
import { SubmissionCompletedEvent, SubmissionCreatedEvent } from '../services/statistics/AssignmentAnlaysis/types';

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


export const getRunStatusHandler = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  logMessage('getRunStatus', `Checking status for job ${jobId}`);

  if (!redisClient.isReady) {
    logMessage('getRunStatus', 'Redis client not ready');
    res.status(503).json({ error: 'Service temporarily unavailable' });
    return;
  }

  try {
    const raw = await redisClient.get(`judge:run:verdict:${jobId}`);
    
    if (raw === null) {
      const verdict: JudgeVerdict = { status: 'pending' };
      res.status(200).json(verdict);
      return;
    }

    const parsedData = JSON.parse(raw);
    
    if (parsedData.status === 'compile_error') {
      const verdict: JudgeVerdict = {
        status: 'compile_error',
        error: {
          errorType: parsedData.error.errorType,
          errorMessage: parsedData.error.errorMessage,
          fullError: parsedData.error.fullError
        }
      };
      res.status(200).json(verdict);
      return;
    }
    
    let testResults: TestResult[];
    
    if (Array.isArray(parsedData)) {
      testResults = parsedData;
    } else if (parsedData.testResults && Array.isArray(parsedData.testResults)) {
      testResults = parsedData.testResults;
      
      if (parsedData.status && parsedData.metrics) {
        res.status(200).json(parsedData);
        return;
      }
    } else {
      testResults = [];
      logMessage('getRunStatus', `No valid test results found in data: ${JSON.stringify(parsedData).substring(0, 200)}`);
    }
        
    const passed = testResults.filter((t) => t.status === 'passed').length;
    const total = testResults.length;
    
    const testsWithTime = testResults.filter((t) => typeof t.executionTime === 'number');
    const avg = testsWithTime.length > 0 
      ? testsWithTime.reduce((sum, t) => sum + (t.executionTime || 0), 0) / testsWithTime.length
      : 0;
    
    const verdict: JudgeVerdict = {
      status: 'completed',
      testResults: testResults,
      metrics: { 
        passedTests: passed, 
        totalTests: total, 
        averageRuntime: Math.round(avg) 
      }
    };

    console.log(verdict);
    res.status(200).json(verdict);
  } catch (err) {
    logMessage('getRunStatus', `Error fetching verdict: ${err}`);
    res.status(500).json({ 
      status: 'system_error',
      error: {
        errorType: 'SYSTEM_ERROR',
        errorMessage: 'Failed to fetch run status',
        fullError: err instanceof Error ? err.message : 'Unknown error'
      }
    });
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

    const createdEvent: SubmissionCreatedEvent = {
      type: 'SUBMISSION_CREATED',
      timestamp: new Date().toISOString(),
      payload: { submissionId, assignmentId, studentId }
    };
    statisticsEventEmitter.emit('SUBMISSION_CREATED', createdEvent.payload);

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
  const fn = 'getSubmitStatus'
  const submissionId = parseInt(req.params.jobId, 10);
  logMessage(fn, `Checking submit status for job ${submissionId}`);

  if (!redisClient.isReady) {
    logMessage(fn, "Redis client not ready");
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  try {
    await updateSubmissionStatus(submissionId, "running");

    const raw = await redisClient.get(`judge:submit:verdict:${submissionId}`);

    if (raw === null) {
      const verdict: JudgeVerdict = { status: "pending" };
      res.status(200).json(verdict);
      return;
    }

    const parsedData = JSON.parse(raw);
    logMessage(
      "getSubmitStatus",
      `Raw verdict data: ${raw.substring(0, 200)}...`
    );

    if (parsedData.status === "compile_error") {
      await updateSubmissionStatus(submissionId, "error");
      const verdict: JudgeVerdict = {
        status: "compile_error",
        error: {
          errorType: parsedData.errorType ?? "COMPILATION_FAILED",
          errorMessage: parsedData.errorMessage ?? "Compilation failed",
          fullError:
            parsedData.fullError ??
            parsedData.errorMessage ??
            "Unknown compilation error",
        },
      };
      res.status(200).json(verdict);
      return;
    }

    let testResults: TestResult[] = [];
    if (Array.isArray(parsedData)) {
      testResults = parsedData;
    } else if (
      parsedData.testResults &&
      Array.isArray(parsedData.testResults)
    ) {
      testResults = parsedData.testResults;

      if (parsedData.status && parsedData.metrics) {
        res.status(200).json(parsedData);
        return;
      }
    } else {
      logMessage(
        fn,
        `No valid test results in: ${JSON.stringify(parsedData).substring(
          0,
          200
        )}`
      );
    }

    const publicTests = testResults.filter((t) => t.isPublic);
    const privateTests = testResults.filter((t) => !t.isPublic);

    const passedPublic = publicTests.filter((t) => t.status === "passed")
      .length;
    const passedPrivate = privateTests.filter((t) => t.status === "passed")
      .length;

    const allWithTime = testResults.filter(
      (t) => typeof t.executionTime === "number"
    );
    const avgRuntime =
      allWithTime.length > 0
        ? Math.round(
            allWithTime.reduce((sum, t) => sum + (t.executionTime || 0), 0) /
              allWithTime.length
          )
        : 0;

    const verdict: JudgeVerdict = {
      status: "completed",
      testResults,
      metrics: {
        privatePassedTests: passedPrivate,
        privateTestsTotal: privateTests.length,
        passedTests: passedPublic + passedPrivate,
        totalTests: publicTests.length + privateTests.length,
        averageRuntime: avgRuntime,
      },
    };

    await updateSubmissionStatus(submissionId, "completed");
    console.log(verdict);
    res.status(200).json(verdict);

    runPlagiarismCheck(submissionId);

    const submission = await getSubmissionById(submissionId);

    console.log( submission);
    console.log( submission.assignment_id);
    const completedEvent: SubmissionCompletedEvent = {
      type: 'SUBMISSION_COMPLETED',
      timestamp: new Date().toISOString(),
      payload: {
        submissionId,
        assignmentId: submission.assignment_id,
        studentId: req.user?.role_id || 0,
        score: (passedPublic + passedPrivate) / (publicTests.length + privateTests.length) * 100,
        passedTests: passedPublic + passedPrivate,
        totalTests: (publicTests.length + privateTests.length),
        publicPassedTests: passedPublic,
        publicTotalTests: publicTests.length + privateTests.length,
        privatePassedTests: passedPrivate,
        privateTotalTests: privateTests.length,
        averageRuntime: avgRuntime,
        status: verdict.status,
        testResults
      }
    };
    statisticsEventEmitter.emit('SUBMISSION_COMPLETED', completedEvent.payload);

  } catch (err) {
    logMessage("getSubmitStatus", `Error fetching verdict: ${err}`);
    res.status(500).json({
      status: "system_error",
      error: {
        errorType: "SYSTEM_ERROR",
        errorMessage: "Failed to fetch submit status",
        fullError: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
};
