import logger from '../config/logger';
import { Request, Response } from 'express';
import { createInstructor, getInstructorByUserId, getInstructorById } from '../models/InstructorModel';


export const createInstructorController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createInstructorController';
  try {
    logger.info(
      { fn: functionName },
      'Received request to create instructor.'
    );
    const instructorData = req.body;
    const instructorId = await createInstructor(instructorData);
    logger.info(
      { fn: functionName, instructorId },
      `Instructor created with ID: ${instructorId}`
    );
    res.status(201).json({ success: true, data: { instructorId } });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error creating instructor: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to create instructor' });
  }
};

export const getInstructorByUserIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getInstructorByUserIdController';
  try {
    const userId = Number(req.params.userId);
    logger.info(
      { fn: functionName, userId },
      `Received request to fetch instructor for user ID: ${userId}`
    );
    const instructor = await getInstructorByUserId(userId);
    logger.info(
      { fn: functionName, userId },
      `Fetched instructor for user ID: ${userId}`
    );
    res.status(200).json({ success: true, data: instructor });
  } catch (error) {
    
    logger.error(
      { fn: functionName, error },
      `Error fetching instructor: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to fetch instructor' });
  }
};

export const getInstructorByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getInstructorByIdController';
  try {
    const instructorId = Number(req.params.instructorId);
    logger.info(
      { fn: functionName, instructorId },
      `Received request to fetch instructor with ID: ${instructorId}`
    );
    const instructor = await getInstructorById(instructorId);
    logger.info(
      { fn: functionName, instructorId },
      `Fetched instructor with ID: ${instructorId}`
    );
    res.status(200).json({ success: true, data: instructor });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error fetching instructor: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to fetch instructor' });
  }
};
