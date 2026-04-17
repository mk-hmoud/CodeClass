import { Request, Response } from "express";
import redisClient from "../config/redis";
import pool from "../config/db";
import logger from "../config/logger";
import { JudgeVerdict, TestResult } from "../types";
import { startSession, getSession, submitSession, getMySession } from "../models/QuizSessionModel";
import {
  createQuizSubmission,
  getQuizProblemTestCases,
  getQuizSubmission,
  getSessionResults,
  getQuizResults,
  saveQuizSubmissionResults,
} from "../models/QuizSubmissionModel";

// ── Session management ────────────────────────────────────────────────────────

export const getMySessionController = async (req: Request, res: Response): Promise<void> => {
  const fn = "getMySessionController";
  try {
    const quizId = parseInt(req.params.quizId, 10);
    if (isNaN(quizId)) { res.status(400).json({ success: false, message: "Invalid quiz ID." }); return; }
    const studentId = req.user!.role_id;
    const session = await getMySession(quizId, studentId);
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error fetching my session");
    res.status(500).json({ success: false, message, });
  }
};

export const startSessionController = async (req: Request, res: Response): Promise<void> => {
  const fn = "startSessionController";
  try {
    const quizId = parseInt(req.params.quizId, 10);
    if (isNaN(quizId)) { res.status(400).json({ success: false, message: "Invalid quiz ID." }); return; }

    const studentId = req.user!.role_id;
    logger.info({ fn, quizId, studentId }, "Starting session");

    const session = await startSession(quizId, studentId);
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error starting session");
    if (message.includes("not found") || message.includes("not published") || message.includes("started") || message.includes("ended")) {
      res.status(400).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to start session.", error: message });
    }
  }
};

export const getSessionController = async (req: Request, res: Response): Promise<void> => {
  const fn = "getSessionController";
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) { res.status(400).json({ success: false, message: "Invalid session ID." }); return; }

    const studentId = req.user!.role_id;
    const session = await getSession(sessionId, studentId);
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error fetching session");
    if (message.includes("not found")) {
      res.status(404).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to fetch session.", error: message });
    }
  }
};

export const submitSessionController = async (req: Request, res: Response): Promise<void> => {
  const fn = "submitSessionController";
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) { res.status(400).json({ success: false, message: "Invalid session ID." }); return; }

    const studentId = req.user!.role_id;
    await submitSession(sessionId, studentId);
    res.status(200).json({ success: true, message: "Quiz submitted." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error submitting session");
    if (message.includes("not found")) {
      res.status(404).json({ success: false, message });
    } else if (message.includes("already submitted")) {
      res.status(409).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to submit session.", error: message });
    }
  }
};

// ── Per-problem code submission ───────────────────────────────────────────────

export const submitProblemController = async (req: Request, res: Response): Promise<void> => {
  const fn = "submitProblemController";
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const quizProblemId = parseInt(req.params.quizProblemId, 10);
    if (isNaN(sessionId) || isNaN(quizProblemId)) {
      res.status(400).json({ success: false, message: "Invalid session or problem ID." });
      return;
    }

    const { code, languageId } = req.body as { code: string; languageId: number };
    if (!code || !languageId) {
      res.status(400).json({ success: false, message: "code and languageId are required." });
      return;
    }
    if (code.length > 10000) {
      res.status(400).json({ success: false, message: "Code too long." });
      return;
    }

    if (!redisClient.isReady) {
      res.status(503).json({ success: false, message: "Judge service temporarily unavailable." });
      return;
    }

    const testCases = await getQuizProblemTestCases(quizProblemId);
    if (testCases.length === 0) {
      res.status(500).json({ success: false, message: "No test cases found for this problem." });
      return;
    }

    const langResult = await pool.query(
      "SELECT name FROM languages WHERE language_id = $1",
      [languageId]
    );
    if (langResult.rowCount === 0) {
      res.status(400).json({ success: false, message: "Invalid language ID." });
      return;
    }
    const language = langResult.rows[0].name;

    const submissionId = await createQuizSubmission(sessionId, quizProblemId, languageId, code);

    await redisClient.hSet(`judge:${submissionId}`, {
      data: JSON.stringify({ code, language, testCases, mode: "submit" }),
      createdAt: Date.now().toString(),
    });
    await redisClient.lPush("judge:queue", submissionId.toString());

    logger.info({ fn, submissionId, sessionId, quizProblemId }, "Quiz problem enqueued");
    res.status(202).json({
      success: true,
      data: {
        submissionId,
        jobId: submissionId,
        statusUrl: `/api/quizzes/submissions/${submissionId}/status`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error submitting quiz problem");
    res.status(500).json({ success: false, message: "Failed to submit problem.", error: message });
  }
};

export const getQuizSubmitStatusController = async (req: Request, res: Response): Promise<void> => {
  const fn = "getQuizSubmitStatusController";
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    if (isNaN(submissionId)) {
      res.status(400).json({ success: false, message: "Invalid submission ID." });
      return;
    }

    if (!redisClient.isReady) {
      res.status(503).json({ error: "Service temporarily unavailable" });
      return;
    }

    const raw = await redisClient.get(`judge:submit:verdict:${submissionId}`);
    if (raw === null) {
      res.status(200).json({ status: "pending" } as JudgeVerdict);
      return;
    }

    const parsedData = JSON.parse(raw);

    if (parsedData.status === "compile_error") {
      await pool.query(
        "UPDATE quiz_submissions SET status = 'error' WHERE submission_id = $1",
        [submissionId]
      );
      const verdict: JudgeVerdict = {
        status: "compile_error",
        error: {
          errorType: parsedData.errorType ?? "COMPILATION_FAILED",
          errorMessage: parsedData.errorMessage ?? "Compilation failed",
          fullError: parsedData.fullError ?? parsedData.errorMessage ?? "Unknown error",
        },
      };
      res.status(200).json(verdict);
      return;
    }

    let testResults: TestResult[] = [];
    if (Array.isArray(parsedData)) {
      testResults = parsedData;
    } else if (parsedData.testResults && Array.isArray(parsedData.testResults)) {
      testResults = parsedData.testResults;
    }

    // Lazy-save results on first completed poll
    const submission = await getQuizSubmission(submissionId);
    if (submission.status !== "completed" && testResults.length > 0) {
      await saveQuizSubmissionResults(submissionId, testResults, submission.points);
    }

    const passed = testResults.filter((t) => t.status === "passed").length;
    const total = testResults.length;
    const avg =
      testResults.filter((t) => typeof t.executionTime === "number").length > 0
        ? Math.round(
            testResults.reduce((sum, t) => sum + (t.executionTime || 0), 0) /
              testResults.length
          )
        : 0;

    const verdict: JudgeVerdict = {
      status: "completed",
      testResults,
      metrics: { passedTests: passed, totalTests: total, averageRuntime: avg },
    };
    res.status(200).json(verdict);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error fetching quiz submit status");
    res.status(500).json({
      status: "system_error",
      error: { errorType: "SYSTEM_ERROR", errorMessage: message, fullError: message },
    });
  }
};

// ── Results ───────────────────────────────────────────────────────────────────

export const getSessionResultsController = async (req: Request, res: Response): Promise<void> => {
  const fn = "getSessionResultsController";
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) { res.status(400).json({ success: false, message: "Invalid session ID." }); return; }

    const results = await getSessionResults(sessionId);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error fetching session results");
    if (message.includes("not found")) {
      res.status(404).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to fetch results.", error: message });
    }
  }
};

export const getQuizResultsController = async (req: Request, res: Response): Promise<void> => {
  const fn = "getQuizResultsController";
  try {
    const quizId = parseInt(req.params.quizId, 10);
    if (isNaN(quizId)) { res.status(400).json({ success: false, message: "Invalid quiz ID." }); return; }

    const results = await getQuizResults(quizId);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error fetching quiz results");
    res.status(500).json({ success: false, message: "Failed to fetch quiz results.", error: message });
  }
};
