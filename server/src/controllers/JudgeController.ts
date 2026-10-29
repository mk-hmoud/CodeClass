import logger from '../config/logger';

import { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import redisClient from '../config/redis';
import { JudgeVerdict, TestCase, TestResult } from '../types';
import { getAssignmentTestCases, getProblemOutputTypeForAssignment } from '../models/ProblemModel';
import { getLibraryCodeForAssignment } from '../models/LibraryModel';
import { createSubmission, getSubmissionById, getSubmissionStatus, saveSubmissionResults, updateSubmissionStatus, uncountAttemptForSubmission, AttemptLimitReachedError, storeSubmissionFiles } from '../models/SubmissionModel';
import { assembleSystemsJob } from '../services/systems/runnerJob';
import { runPlagiarismCheck } from './PlagiarismController';
import { systemEventEmitter } from '../services/statistics/emitter'; 
import { SubmissionCompletedEvent, SubmissionCreatedEvent } from '../services/statistics/events';
import { canStudentAccessAssignment, getSubmissionAttemptCount, getAssignmentRuntime, resolveAssignmentProblemId, getAssignmentOwnerInstructorId } from '../models/AssignmentModel';
import { getInstructorByUserId } from '../models/InstructorModel';
import { calculateGrade } from '../services/grading/Grader';


interface RunCodeRequest {
  code: string;
  language: string;
  testCases: TestCase[];
  outputType?: 'text' | 'image';
  assignmentId?: number;
}

export const runCodeHandler = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { code, language, testCases, outputType, assignmentId } = req.body as RunCodeRequest;
  const runtime = (req.body as { runtime?: string }).runtime;
  const files = (req.body as { files?: { path: string; content: string }[] }).files;
  const bodyProblemId = (req.body as { problemId?: number }).problemId;

  // Systems Run: build + run against PUBLIC tests only, no attempt recorded.
  if (runtime === "systems") {
    if (!assignmentId || !Array.isArray(files)) {
      res.status(400).json({ error: "Missing files or assignmentId" });
      return;
    }
    if (!redisClient.isReady) {
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }
    try {
      const pid = await resolveAssignmentProblemId(assignmentId, bodyProblemId);
      const rt = await getAssignmentRuntime(assignmentId, pid);
      if (rt?.runtime !== "systems") {
        res.status(400).json({ error: "Not a systems assignment" });
        return;
      }
      const job = await assembleSystemsJob(rt.problemId, files);
      job.testCases = job.testCases.filter((t) => t.isPublic);
      const jobId = nanoid();
      await redisClient.hSet(`judge:${jobId}`, {
        data: JSON.stringify({ runtime: "systems", runnerInput: JSON.stringify(job), language: "c", mode: "run" }),
        createdAt: Date.now().toString(),
      });
      await redisClient.lPush("judge:queue", jobId);
      res.status(202).json({ job_id: jobId, status_url: `/api/judge/status/${jobId}` });
    } catch (err) {
      logger.error({ fn: "runCode", error: err }, `Systems run failed: ${err}`);
      res.status(500).json({ error: "Failed to queue run" });
    }
    return;
  }

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

    let libraryCode: string | null = null;
    if (assignmentId) {
      try {
        libraryCode = await getLibraryCodeForAssignment(assignmentId, language);
      } catch (err) {
        logger.error(
          { fn: 'runCode', assignmentId, language, error: err },
          `Error fetching library code, proceeding without it: ${err}`
        );
      }
    }

    const mode = "run";
    await redisClient.hSet(`judge:${jobId}`, {
      data: JSON.stringify({ code, language, testCases, mode, outputType: outputType || 'text', libraryCode }),
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


/**
 * Instructor "preview as student" full grade. Builds the SAME grading job a
 * student submit would (all tests, resolved server-side), but enqueues it as a
 * RUN job so the verdict is read back via the run-status path WITHOUT recording
 * any submission or attempt. Requires the caller to own the assignment.
 */
export const previewGradeHandler = async (req: Request, res: Response): Promise<void> => {
  const fn = "previewGrade";
  const { assignmentId, problemId: bodyProblemId, code, language, files } = req.body as {
    assignmentId: number; problemId?: number; code?: string; language: string;
    files?: { path: string; content: string }[];
  };

  if (req.user?.role !== "instructor") {
    res.status(403).json({ error: "Instructor role required" });
    return;
  }
  const instructor = await getInstructorByUserId(req.user.id);
  if (!instructor) {
    res.status(401).json({ error: "Instructor not identified" });
    return;
  }

  const hasFiles = Array.isArray(files) && files.length > 0;
  if ((!code && !hasFiles) || !language || !assignmentId) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  const owner = await getAssignmentOwnerInstructorId(assignmentId);
  if (owner === null || owner !== instructor.instructor_id) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  if (!redisClient.isReady) {
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  let problemId: number;
  try {
    problemId = await resolveAssignmentProblemId(assignmentId, bodyProblemId);
  } catch {
    res.status(404).json({ error: "Problem not found in assignment" });
    return;
  }

  try {
    const jobId = nanoid();
    const rt = await getAssignmentRuntime(assignmentId, problemId);
    let data: string;
    if (rt?.runtime === "systems") {
      // All tests (public + private) -- the instructor is allowed to see them.
      const job = await assembleSystemsJob(rt.problemId, files ?? []);
      data = JSON.stringify({ runtime: "systems", runnerInput: JSON.stringify(job), language: "c", mode: "run" });
    } else {
      const testCases = await getAssignmentTestCases(assignmentId, problemId);
      if (testCases.length === 0) {
        res.status(500).json({ error: "No test cases found for this problem" });
        return;
      }
      let libraryCode: string | null = null;
      try { libraryCode = await getLibraryCodeForAssignment(assignmentId, language); } catch { /* optional */ }
      let outputType: 'text' | 'image' = 'text';
      try { outputType = await getProblemOutputTypeForAssignment(assignmentId, problemId); } catch { /* default */ }
      data = JSON.stringify({ code, language, testCases, mode: "run", libraryCode, outputType });
    }
    await redisClient.hSet(`judge:${jobId}`, { data, createdAt: Date.now().toString() });
    await redisClient.lPush("judge:queue", jobId);
    logger.info({ fn, assignmentId, problemId, jobId }, `Queued preview grade ${jobId}`);
    res.status(202).json({ job_id: jobId, status_url: `/api/judge/status/run/${jobId}` });
  } catch (err) {
    logger.error({ fn, assignmentId, error: err }, `Preview grade failed: ${err}`);
    res.status(500).json({ error: "Failed to queue preview grade" });
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
  const { assignmentId, problemId: bodyProblemId, code, language, files } = req.body as {
    assignmentId: number;
    problemId?: number;   // which problem in the assignment; defaults to primary
    code: string;
    language: string;
    files?: { path: string; content: string }[];  // systems problems submit files
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
  

  const hasFiles = Array.isArray(files) && files.length > 0;
  if ((!code && !hasFiles) || !language || !assignmentId) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  try {
    if (!(await canStudentAccessAssignment(assignmentId, studentId))) {
      logger.warn(
        { fn: functionName, studentId, assignmentId },
        `Student ${studentId} may not submit to assignment ${assignmentId}`
      );
      res.status(404).json({ success: false, message: 'Assignment not found' });
      return;
    }
  } catch (err) {
    logger.error({ fn: functionName, error: err }, `Error checking assignment access: ${err}`);
    res.status(500).json({ success: false, message: 'Failed to verify assignment access' });
    return;
  }

  // Resolve (and validate membership of) the problem being submitted. Throws
  // if a bogus problemId that is not in this assignment is supplied.
  let problemId: number;
  try {
    problemId = await resolveAssignmentProblemId(assignmentId, bodyProblemId);
  } catch (err) {
    logger.warn({ fn: functionName, assignmentId, bodyProblemId }, `Invalid problem for assignment: ${err}`);
    res.status(404).json({ success: false, message: 'Problem not found in assignment' });
    return;
  }

  let submissionId: number;
  try {
    // The attempt limit is enforced inside createSubmission, atomically with
    // recording the attempt, so concurrent submits cannot both get through.
    const effectiveCode = code
      ? code
      : (files as { path: string; content: string }[])
          .map((f) => `/* ===== ${f.path} ===== */\n${f.content}`)
          .join("\n\n");
    submissionId = await createSubmission({
      studentId,
      assignmentId,
      problemId,
      language,
      code: effectiveCode,
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
    if (err instanceof AttemptLimitReachedError) {
      res.status(403).json({ success: false, message: err.message });
      return;
    }
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
    testCases = await getAssignmentTestCases(assignmentId, problemId);
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

  let libraryCode: string | null = null;
  try {
    libraryCode = await getLibraryCodeForAssignment(assignmentId, language);
  } catch (err) {
    logger.error(
      { fn: functionName, assignmentId, language, error: err },
      `Error fetching library code, proceeding without it: ${err}`
    );
  }

  let outputType: 'text' | 'image' = 'text';
  try {
    outputType = await getProblemOutputTypeForAssignment(assignmentId, problemId);
  } catch (err) {
    logger.error(
      { fn: functionName, assignmentId, error: err },
      `Error fetching problem output type, defaulting to text: ${err}`
    );
  }

  let jobData: string;
  try {
    const rt = await getAssignmentRuntime(assignmentId, problemId);
    if (rt?.runtime === "systems") {
      if (hasFiles) await storeSubmissionFiles(submissionId, files!);
      const job = await assembleSystemsJob(rt.problemId, files ?? []);
      // The worker routes runtime==="systems" to judge-systems and forwards
      // runnerInput verbatim; testCases are carried inside runnerInput.
      jobData = JSON.stringify({ runtime: "systems", runnerInput: JSON.stringify(job), language, mode: "submit" });
    } else {
      jobData = JSON.stringify({ code, language, testCases, mode: "submit", libraryCode, outputType });
    }
  } catch (err) {
    logger.error({ fn: functionName, submissionId, error: err }, `Error assembling job: ${err}`);
    res.status(500).json({ error: "Failed to assemble grading job" });
    return;
  }

  try {
    await redisClient.hSet(`judge:${submissionId}`, {
      data: jobData,
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
    attemptCount = await getSubmissionAttemptCount(assignmentId, studentId, problemId);
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
  const submissionId = parseInt(req.params.jobId as string, 10);
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
      // A compile error is a typo, not a real attempt -- give it back.
      await uncountAttemptForSubmission(submissionId);
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

    const currentStatus = await getSubmissionStatus(submissionId);
    if (currentStatus === "completed" || currentStatus === "error") {
      // A previous poll already ran grading/plagiarism/statistics for this
      // submission -- just return the verdict, don't repeat that work.
      logger.debug(
        { fn, submissionId, currentStatus },
        "Submission already fully processed by an earlier poll; skipping grading/plagiarism/statistics side effects"
      );
      res.status(200).json(verdict);
      return;
    }

    updateSubmissionStatus(submissionId, "completed");
    saveSubmissionResults(submissionId, testResults).catch((error) => {
      // This was previously fire-and-forget with no .catch() at all -- any
      // failure here (bad data, a constraint violation, whatever) was totally
      // silent: the response below still reports success, grading still runs
      // off the in-memory verdict, and submission_results just quietly ends up
      // empty for that submission with no trace anywhere.
      logger.error(
        { fn, submissionId, error },
        `Failed to persist submission results for submission ${submissionId}: ${error}`
      );
    });
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
