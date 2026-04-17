import { Request, Response } from "express";
import {
  createQuiz,
  deleteQuiz,
  getQuizById,
  getQuizzesByClassroom,
  togglePublish,
  updateQuiz,
} from "../models/QuizModel";
import { QuizCreationData, QuizUpdateData } from "../types";
import logger from "../config/logger";

export const createQuizController = async (req: Request, res: Response): Promise<void> => {
  const fn = "createQuizController";
  try {
    logger.info({ fn }, "Received request to create a new quiz");
    const instructorId = req.user!.role_id;
    const quizData: QuizCreationData = req.body;

    if (!quizData.title || !quizData.classroomId || !quizData.problems?.length) {
      res.status(400).json({ success: false, message: "title, classroomId, and at least one problem are required." });
      return;
    }

    const result = await createQuiz(quizData, instructorId);
    logger.info({ fn, quizId: result.quizId }, "Quiz created");
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error creating quiz");
    res.status(500).json({ success: false, message: "Failed to create quiz.", error: message });
  }
};

export const getQuizzesByClassroomController = async (req: Request, res: Response): Promise<void> => {
  const fn = "getQuizzesByClassroomController";
  try {
    const classroomId = parseInt(req.params.classroomId as string, 10);
    if (isNaN(classroomId)) {
      res.status(400).json({ success: false, message: "Invalid classroom ID." });
      return;
    }
    logger.debug({ fn, classroomId }, "Fetching quizzes");
    const quizzes = await getQuizzesByClassroom(classroomId);
    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error fetching quizzes");
    res.status(500).json({ success: false, message: "Failed to fetch quizzes.", error: message });
  }
};

export const getQuizByIdController = async (req: Request, res: Response): Promise<void> => {
  const fn = "getQuizByIdController";
  try {
    const quizId = parseInt(req.params.quizId as string, 10);
    if (isNaN(quizId)) {
      res.status(400).json({ success: false, message: "Invalid quiz ID." });
      return;
    }
    logger.debug({ fn, quizId }, "Fetching quiz");
    const quiz = await getQuizById(quizId);
    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error fetching quiz");
    if (message.includes("not found")) {
      res.status(404).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to fetch quiz.", error: message });
    }
  }
};

export const updateQuizController = async (req: Request, res: Response): Promise<void> => {
  const fn = "updateQuizController";
  try {
    const quizId = parseInt(req.params.quizId as string, 10);
    if (isNaN(quizId)) {
      res.status(400).json({ success: false, message: "Invalid quiz ID." });
      return;
    }
    const instructorId = req.user!.role_id;
    const data: QuizUpdateData = req.body;
    logger.info({ fn, quizId, instructorId }, "Updating quiz");
    await updateQuiz(quizId, instructorId, data);
    res.status(200).json({ success: true, message: "Quiz updated." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error updating quiz");
    if (message.includes("Forbidden")) {
      res.status(403).json({ success: false, message });
    } else if (message.includes("not found")) {
      res.status(404).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to update quiz.", error: message });
    }
  }
};

export const togglePublishController = async (req: Request, res: Response): Promise<void> => {
  const fn = "togglePublishController";
  try {
    const quizId = parseInt(req.params.quizId as string, 10);
    if (isNaN(quizId)) {
      res.status(400).json({ success: false, message: "Invalid quiz ID." });
      return;
    }
    const instructorId = req.user!.role_id;
    logger.info({ fn, quizId, instructorId }, "Toggling publish status");
    const result = await togglePublish(quizId, instructorId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error toggling publish");
    if (message.includes("Forbidden")) {
      res.status(403).json({ success: false, message });
    } else if (message.includes("not found")) {
      res.status(404).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to toggle publish.", error: message });
    }
  }
};

export const deleteQuizController = async (req: Request, res: Response): Promise<void> => {
  const fn = "deleteQuizController";
  try {
    const quizId = parseInt(req.params.quizId as string, 10);
    if (isNaN(quizId)) {
      res.status(400).json({ success: false, message: "Invalid quiz ID." });
      return;
    }
    const instructorId = req.user!.role_id;
    logger.info({ fn, quizId, instructorId }, "Deleting quiz");
    await deleteQuiz(quizId, instructorId);
    res.status(200).json({ success: true, message: "Quiz deleted." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ fn, error }, "Error deleting quiz");
    if (message.includes("Forbidden")) {
      res.status(403).json({ success: false, message });
    } else if (message.includes("not found")) {
      res.status(404).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message: "Failed to delete quiz.", error: message });
    }
  }
};
