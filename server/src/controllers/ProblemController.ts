import { Request, Response } from "express";
import {
  createProblem,
  getProblemById,
  getProblemsByInstructor,
  updateProblem,
  deleteProblem,
} from "../models/ProblemModel";
import { ProblemCreationData } from "../types";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] [ProblemController.ts] [${functionName}] ${message}`
  );
};

export const createProblemController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = "createProblemController";
  try {
    logMessage(functionName, "Received request to create problem.");

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
    logMessage(functionName, `Problem created with ID: ${result.problemId}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logMessage(functionName, `Error creating problem: ${error}`);
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
    logMessage(
      functionName,
      `Received request to fetch problem ID: ${problemId}`
    );
    const problem = await getProblemById(problemId);
    if (!problem) {
      res.status(404).json({ success: false, message: "Problem not found" });
      return;
    }
    logMessage(functionName, `Fetched problem ID: ${problemId}`);
    res.status(200).json({ success: true, data: problem });
  } catch (error) {
    logMessage(functionName, `Error fetching problem: ${error}`);
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
    logMessage(functionName, "Received request to fetch problems.");

    if (!req.user || !req.user.role_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Instructor not identified",
      });
      return;
    }
    const instructorId = req.user.role_id;
    const problems = await getProblemsByInstructor(instructorId);
    logMessage(
      functionName,
      `Fetched ${problems.length} problems for instructor ID: ${instructorId}`
    );
    res.status(200).json({ success: true, data: problems });
  } catch (error) {
    logMessage(functionName, `Error fetching problems: ${error}`);
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
    logMessage(
      functionName,
      `Received request to update problem ID: ${problemId}`
    );
    const updatedProblem = await updateProblem(problemId, problemData);
    logMessage(functionName, `Updated problem ID: ${problemId}`);
    res.status(200).json({ success: true, data: updatedProblem });
  } catch (error) {
    logMessage(functionName, `Error updating problem: ${error}`);
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
    logMessage(
      functionName,
      `Received request to delete problem ID: ${problemId}`
    );
    await deleteProblem(problemId);
    logMessage(functionName, `Deleted problem ID: ${problemId}`);
    res
      .status(200)
      .json({ success: true, message: "Problem deleted successfully" });
  } catch (error) {
    logMessage(functionName, `Error deleting problem: ${error}`);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete problem" });
  }
};
