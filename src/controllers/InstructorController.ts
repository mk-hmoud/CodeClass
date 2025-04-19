import { Request, Response } from 'express';
import { createInstructor, getInstructorByUserId, getInstructorById } from '../models/InstructorModel';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [InstructorController.ts] [${functionName}] ${message}`);
};

export const createInstructorController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createInstructorController';
  try {
    logMessage(functionName, 'Received request to create instructor.');
    const instructorData = req.body;
    const instructorId = await createInstructor(instructorData);
    logMessage(functionName, `Instructor created with ID: ${instructorId}`);
    res.status(201).json({ success: true, data: { instructorId } });
  } catch (error) {
    logMessage(functionName, `Error creating instructor: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to create instructor' });
  }
};

export const getInstructorByUserIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getInstructorByUserIdController';
  try {
    const userId = Number(req.params.userId);
    logMessage(functionName, `Received request to fetch instructor for user ID: ${userId}`);
    const instructor = await getInstructorByUserId(userId);
    logMessage(functionName, `Fetched instructor for user ID: ${userId}`);
    res.status(200).json({ success: true, data: instructor });
  } catch (error) {
    logMessage(functionName, `Error fetching instructor: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch instructor' });
  }
};

export const getInstructorByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getInstructorByIdController';
  try {
    const instructorId = Number(req.params.instructorId);
    logMessage(functionName, `Received request to fetch instructor with ID: ${instructorId}`);
    const instructor = await getInstructorById(instructorId);
    logMessage(functionName, `Fetched instructor with ID: ${instructorId}`);
    res.status(200).json({ success: true, data: instructor });
  } catch (error) {
    logMessage(functionName, `Error fetching instructor: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch instructor' });
  }
};
