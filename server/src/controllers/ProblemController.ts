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
