import logger from '../config/logger';
import { Request, Response } from 'express';
import { createStudent, getStudentByUserId, getStudentById } from '../models/StudentModel';


export const createStudentController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createStudentController';
  try {
    logger.info(
      { fn: functionName },
      "Received request to create student."
    );
    const studentData = req.body;
    const studentId = await createStudent(studentData);
    logger.info(
      { fn: functionName, studentId },
      `Student created with ID: ${studentId}`
    );
    res.status(201).json({ success: true, data: { studentId } });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error creating student: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to create student' });
  }
};

export const getStudentByUserIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getStudentByUserIdController';
  try {
    const userId = Number(req.params.userId);
    
    logger.info(
      { fn: functionName, userId },
      `Received request to fetch student for user ID: ${userId}`
    );
    const student = await getStudentByUserId(userId);
    
    logger.info(
      { fn: functionName, userId },
      `Fetched student for user ID: ${userId}`
    );
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error fetching student: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};

export const getStudentByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getStudentByIdController';
  try {
    const studentId = Number(req.params.studentId);
    logger.info(
      { fn: functionName, studentId },
      `Received request to fetch student with ID: ${studentId}`
    );
    const student = await getStudentById(studentId);
    logger.info(
      { fn: functionName, studentId },
      `Fetched student with ID: ${studentId}`
    );    
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error fetching student: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};
