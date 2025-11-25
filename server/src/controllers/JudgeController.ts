import logger from '../config/logger';

import { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import redisClient from '../config/redis';
import { JudgeVerdict, TestCase, TestResult } from '../types';
import { getAssignmentTestCases } from '../models/ProblemModel';
import { createSubmission, getSubmissionById, saveSubmissionResults, updateSubmissionStatus } from '../models/SubmissionModel';
import { runPlagiarismCheck } from './PlagiarismController';
import { systemEventEmitter } from '../services/statistics/emitter'; 
import { SubmissionCompletedEvent, SubmissionCreatedEvent } from '../services/statistics/events';
import { getRemainingAttempts, getSubmissionAttemptCount } from '../models/AssignmentModel';
import { calculateGrade } from '../services/grading/Grader';


interface RunCodeRequest {
  code: string;
  language: string;
  testCases: TestCase[];
}

export const runCodeHandler = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { code, language, testCases } = req.body as RunCodeRequest;

  logger.info(
    { fn: 'runCode', language, codeLen: code?.length, testCount: testCases?.length },
    `Submission received – lang=${language}, codeLen=${code?.length}, tests=${testCases?.length}`
  );

  if (!code || !language || !Array.isArray(testCases)) {
    logger.warn(
      { fn: 'runCode' },
      'Invalid request – missing parameters'
    );
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  if (code.length > 10000) {
    logger.warn(
      { fn: 'runCode', codeLen: code.length },
      `Payload too large – codeLen=${code.length}`
    );
    res
      .status(400)
      .json({ error: 'Code too long' });
    return;
  }

  if (!redisClient.isReady) {
    logger.error(
      { fn: 'runCode' },
      'Redis client not ready, rejecting request'
    );
    res.status(503).json({ error: 'Service temporarily unavailable' });
    return;
  }

  try {
    const jobId = nanoid();
    logger.debug(
      { fn: 'runCode', jobId },
      `Enqueueing job ${jobId}`
    );

    const mode = "run";
    await redisClient.hSet(`judge:${jobId}`, {
      data: JSON.stringify({ code, language, testCases, mode }),
      createdAt: Date.now().toString(),
    });

    await redisClient.lPush('judge:queue', jobId);

    const duration = Date.now() - startTime;
    logger.info(
      { fn: 'runCode', jobId, durationMs: duration },
      `Job ${jobId} enqueued in ${duration}ms`
    );

    res.status(202).json({
      job_id: jobId,
      status_url: `/api/judge/status/${jobId}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error(
      { fn: 'runCode', error: msg },
      `Failed to enqueue job – ${msg}`
    );
    res.status(500).json({
      error: 'Failed to queue submission',
      details: process.env.NODE_ENV === 'development' ? msg : undefined,
    });
  }
};


export const getRunStatusHandler = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  logger.info(
    { fn: 'getRunStatus', jobId },
    `Checking status for job ${jobId}`
  );

  if (!redisClient.isReady) {
    logger.error(
      { fn: 'getRunStatus' },
      'Redis client not ready'
    );
    
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
      logger.warn(
        { fn: 'getRunStatus', jobId, raw: JSON.stringify(parsedData) },
        `No valid test results found in data: ${JSON.stringify(parsedData)}`
      );
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
      logger.warn(
        { fn: 'getRunStatus', jobId, rawSnippet: JSON.stringify(parsedData).substring(0, 200) },
        `No valid test results found in data: ${JSON.stringify(parsedData).substring(0, 200)}`
      );
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
    logger.error(
      { fn: 'getRunStatus', jobId, error: err },
      `Error fetching verdict: ${err}`
    );
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
    logger.warn(
      { fn: functionName },
      'No user in request.'
    );
    
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (req.user?.role !== "student") {
    logger.warn(
      { fn: functionName, userId: req.user?.id, role: req.user?.role },
      `User ${req.user?.id} is not a student`
    );
    res.status(403).json({ success: false, message: 'Forbidden: Student role required' });
    return;
  }

  const studentId = req.user.role_id as number;

  logger.info(
    { fn: functionName, studentId, assignmentId },
    `Student ${studentId} submitting assignment ${assignmentId}`
  );
  

  if (!code || !language || !assignmentId) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  try {
    const remainingAttempts = await getRemainingAttempts(assignmentId, studentId);
    logger.info(
      { fn: functionName, studentId, assignmentId, remainingAttempts },
      `Student ${studentId} has ${remainingAttempts} attempts remaining for assignment ${assignmentId}`
    );
    
    if (remainingAttempts <= 0) {
      logger.info(
        { fn: functionName, studentId, assignmentId },
        `Student ${studentId} has no remaining attempts for assignment ${assignmentId}`
      );
      res.status(403).json({ 
        success: false, 
        message: 'Maximum submission attempts reached for this assignment' 
      });
      return;
    }
  } catch (err) {
    logger.error(
      { fn: functionName, error: err },
      `Error checking remaining attempts: ${err}`
    );
  }

  let submissionId: number;
  try {
    submissionId = await createSubmission({
      studentId,
      assignmentId,
      language,
      code,
    });

    logger.info(
      { fn: functionName, submissionId, assignmentId, studentId },
      `Created submission ${submissionId}`
    );

    const createdEvent: SubmissionCreatedEvent = {
      type: 'SUBMISSION_CREATED',
      timestamp: new Date().toISOString(),
      payload: { submissionId, assignmentId, studentId }
    };
    systemEventEmitter.emit('SUBMISSION_CREATED', createdEvent.payload);

  } catch (err) {
    logger.error(
      { fn: functionName, error: err },
      `Error creating submission: ${err}`
    );
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  if (!redisClient.isReady) {
    logger.error(
      { fn: functionName },
      'Redis not ready'
    );
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
    logger.error(
      { fn: functionName, assignmentId, error: err },
      `Error fetching test cases: ${err}`
    );
    res.status(500).json({ error: "Failed to load test cases" });
    return;
  }

  try {
    await redisClient.hSet(`judge:${submissionId}`, {
      data: JSON.stringify({ code, language, testCases, mode: "submit"}),
      createdAt: Date.now().toString(),
    });
    await redisClient.lPush("judge:queue", submissionId.toString());
    logger.info(
      { fn: functionName, submissionId },
      `Enqueued job ${submissionId} for submission ${submissionId}`
    );
  } catch (err) {
    logger.error(
      { fn: functionName, submissionId, error: err },
      `Error enqueuing job: ${err}`
    );
    
    res.status(500).json({ error: "Failed to queue grading job" });
    return;
  }

  let attemptCount = 0;
  try {
    attemptCount = await getSubmissionAttemptCount(assignmentId, studentId);
  } catch (err) {
    logger.error(
      { fn: functionName, assignmentId, studentId, error: err },
      `Error getting attempt count: ${err}`
    );
  }

  res.status(202).json({
    submissionId,
    job_id: submissionId,
    status_url: `/api/judge/status/${submissionId}`,
    attemptCount,
    attemptHistory: `/api/submissions/attempts/${assignmentId}` // Endpoint to retrieve attempt history
  });
}

export const getSubmitStatusHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = 'getSubmitStatus'
  const submissionId = parseInt(req.params.jobId, 10);
  logger.info(
    { fn, submissionId },
    `Checking submit status for job ${submissionId}`
  );

  if (!redisClient.isReady) {
    
    logger.error(
      { fn },
      'Redis client not ready'
    );
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
    logger.debug(
      { fn: 'getSubmitStatus', submissionId, rawSnippet: raw.substring(0, 200) },
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
      logger.warn(
        {
          fn,
          submissionId,
          rawSnippet: JSON.stringify(parsedData).substring(0, 200)
        },
        `No valid test results in: ${JSON.stringify(parsedData).substring(0, 200)}`
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

    updateSubmissionStatus(submissionId, "completed");
    console.log(verdict);
    saveSubmissionResults(submissionId, testResults);
    res.status(200).json(verdict);

    runPlagiarismCheck(submissionId);

    const submission = await getSubmissionById(submissionId);

        try {
          const gradeResult = await calculateGrade(
            submissionId,
            testResults,
            {
              passedTests: passedPublic + passedPrivate,
              totalTests: publicTests.length + privateTests.length,
              privatePassedTests: passedPrivate,
              privateTotalTests: privateTests.length,
              averageRuntime: avgRuntime
            },
            submission.assignment_id
          );
          
          logger.info(
            { fn, submissionId, autoScore: gradeResult.autoScore },
            `Grade calculated for submission ${submissionId}: ${gradeResult.autoScore}`
          );
          
          
        } catch (gradeError) {
          logger.error({fn}, `Error calculating grade: ${gradeError}`);
        }

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
    systemEventEmitter.emit('SUBMISSION_COMPLETED', completedEvent.payload);

  } catch (err) {
    logger.error(
      { fn: 'getSubmitStatus', error: err },
      `Error fetching verdict: ${err}`
    );
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
