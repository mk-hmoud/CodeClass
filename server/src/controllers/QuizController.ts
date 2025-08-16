import { Request, Response } from "express";
import { createQuiz, deleteQuiz } from "../models/QuizModel";
import { QuizCreationData } from "../types";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [QuizController.ts] [${functionName}] ${message}`);
};

export const createQuizController = async (req: Request, res: Response): Promise<void> => {
  const fn = "createQuizController";
  try {
    logMessage(fn, "Received request to create a new quiz.");

    if (req.user?.role !== 'instructor' || !req.user?.role_id) {
      logMessage(fn, "Unauthorized attempt to create quiz.");
      res.status(403).json({ success: false, message: "Forbidden: Only instructors can create quizzes." });
      return;
    }

    const instructorId = req.user.role_id;
    const quizData: QuizCreationData = req.body;

    if (!quizData.title || !quizData.classroomId || !quizData.problems || quizData.problems.length === 0) {
        logMessage(fn, "Bad request: Missing required fields.");
        res.status(400).json({ success: false, message: "Missing required fields: title, classroomId, and at least one problem are required." });
        return;
    }

    const result = await createQuiz(quizData, instructorId);
    logMessage(fn, `Quiz created successfully with ID: ${result.quizId}`);
    res.status(201).json({ success: true, data: result });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    logMessage(fn, `Error creating quiz: ${errorMessage}`);
    res.status(500).json({ success: false, message: "Failed to create quiz.", error: errorMessage });
  }
};

export const deleteQuizController = async (req: Request, res: Response): Promise<void> => {
    const fn = "deleteQuizController";
    try {
        const quizId = parseInt(req.params.quizId, 10);
        logMessage(fn, `Received request to delete quiz ${quizId}.`);

        if (isNaN(quizId)) {
            logMessage(fn, "Bad request: Invalid quiz ID.");
            res.status(400).json({ success: false, message: "Invalid quiz ID provided." });
            return;
        }

        if (req.user?.role !== 'instructor' || !req.user?.role_id) {
            logMessage(fn, "Unauthorized attempt to delete quiz.");
            res.status(403).json({ success: false, message: "Forbidden: Only instructors can delete quizzes." });
            return;
        }
        const instructorId = req.user.role_id;

        await deleteQuiz(quizId, instructorId);
        logMessage(fn, `Quiz ${quizId} deleted successfully.`);
        res.status(200).json({ success: true, message: "Quiz deleted successfully." });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        logMessage(fn, `Error deleting quiz: ${errorMessage}`);

        if (errorMessage.includes("Forbidden")) {
            res.status(403).json({ success: false, message: errorMessage });
        } else if (errorMessage.includes("not found")) {
            res.status(404).json({ success: false, message: errorMessage });
        } else {
            res.status(500).json({ success: false, message: "Failed to delete quiz.", error: errorMessage });
        }
    }
};