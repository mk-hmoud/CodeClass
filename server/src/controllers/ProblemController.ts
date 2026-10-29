import logger from '../config/logger';

import { Request, Response } from "express";
import {
  createProblem,
  getProblemById,
  getProblemsByInstructor,
  updateProblem,
  deleteProblem,
} from "../models/ProblemModel";
import { ProblemCreationData } from "../types";
import {
  suggestTestCases,
  isAiConfigured,
  AiNotConfiguredError,
} from "../services/ai/testCaseSuggester";


export const createProblemController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = "createProblemController";
  try {
    logger.info(
      { fn: functionName },
      "Received request to create problem."
    );

    if (!req.user || !req.user.role_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Instructor not identified",
      });
      return;
    }

    const problemData: ProblemCreationData = {
      instructorId: req.user.role_id,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      prerequisites: req.body.prerequisites,
      learning_outcomes: req.body.learning_outcomes,
      tags: req.body.tags,
      testCases: req.body.testCases,
      outputType: req.body.outputType,
      runtime: req.body.runtime,
      buildCommand: req.body.buildCommand,
      entrypoint: req.body.entrypoint,
      files: req.body.files,
    };

    const result = await createProblem(problemData);
    logger.info(
      { fn: functionName, problemId: result.problemId },
      `Problem created with ID: ${result.problemId}`
    );
    
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error creating problem: ${error}`
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to create problem" });
  }
};

export const getProblemByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = "getProblemByIdController";
  try {
    const problemId = Number(req.params.problemId);
    logger.info(
      { fn: functionName, problemId },
      `Received request to fetch problem ID: ${problemId}`
    );
    const problem = await getProblemById(problemId);
    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }
    
    logger.info(
      { fn: functionName, problemId },
      `Fetched problem ID: ${problemId}`
    );
    res.status(200).json({ success: true, data: problem });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error fetching problem: ${error}`
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch problem" });
  }
};

export const getProblemsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = "getProblemsController";
  try {
    logger.info(
      { fn: functionName },
      "Received request to fetch problems."
    );

    if (!req.user || !req.user.role_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Instructor not identified",
      });
      return;
    }
    const instructorId = req.user.role_id;
    const problems = await getProblemsByInstructor(instructorId);
    logger.info(
      { fn: functionName, instructorId, count: problems.length },
      `Fetched ${problems.length} problems for instructor ID: ${instructorId}`
    );
    
    res.status(200).json({ success: true, data: problems });
  } catch (error) {
    
    logger.error(
      { fn: functionName, error },
      `Error fetching problems: ${error}`
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch problems" });
  }
};

export const updateProblemController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = "updateProblemController";
  try {
    const problemId = Number(req.params.problemId);
    const problemData: ProblemCreationData = req.body;
    logger.info(
      { fn: functionName, problemId },
      `Received request to update problem ID: ${problemId}`
    );
    const updatedProblem = await updateProblem(problemId, problemData);
    logger.info(
      { fn: functionName, problemId },
      `Updated problem ID: ${problemId}`
    );
    res.status(200).json({ success: true, data: updatedProblem });
  } catch (error) {
    
    logger.error(
      { fn: functionName, error },
      `Error updating problem: ${error}`
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to update problem" });
  }
};

export const suggestTestCasesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = "suggestTestCasesController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Instructor not identified",
      });
      return;
    }

    const { title, description, category, outputType, count, existingInputs } =
      req.body;

    if (!title?.trim() || !description?.trim()) {
      res.status(400).json({
        success: false,
        message: "A problem title and description are required to suggest test cases.",
      });
      return;
    }

    logger.info({ fn: functionName }, "Received request to suggest test cases.");

    const suggestions = await suggestTestCases({
      title,
      description,
      category,
      outputType,
      count,
      existingInputs: Array.isArray(existingInputs) ? existingInputs : undefined,
    });

    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      logger.warn({ fn: functionName }, "AI suggestions requested but not configured.");
      res.status(503).json({
        success: false,
        message:
          "AI suggestions aren't set up on this server yet. Add the provider key to enable them.",
      });
      return;
    }
    logger.error(
      { fn: functionName, error },
      `Error suggesting test cases: ${error}`
    );
    res.status(502).json({
      success: false,
      message: "The AI provider could not generate suggestions right now. Please try again.",
    });
  }
};

/** Lightweight capability probe so the client can show/hide the AI button. */
export const aiStatusController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.status(200).json({ success: true, data: { enabled: isAiConfigured() } });
};

export const deleteProblemController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = "deleteProblemController";
  try {
    const problemId = Number(req.params.problemId);
    logger.info(
      { fn: functionName, problemId },
      `Received request to delete problem ID: ${problemId}`
    );
    await deleteProblem(problemId);
    logger.info(
      { fn: functionName, problemId },
      `Deleted problem ID: ${problemId}`
    );
    
    res
      .status(200)
      .json({ success: true, message: "Problem deleted successfully" });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error deleting problem: ${error}`
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to delete problem" });
  }
};
