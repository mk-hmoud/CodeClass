import { Request, Response } from 'express';
import { createStudent, getStudentByUserId, getStudentById } from '../models/StudentModel';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [StudentController.ts] [${functionName}] ${message}`);
};

export const createStudentController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createStudentController';
  try {
    logMessage(functionName, "Received request to create student.");
    const studentData = req.body;
    const studentId = await createStudent(studentData);
    logMessage(functionName, `Student created with ID: ${studentId}`);
    res.status(201).json({ success: true, data: { studentId } });
  } catch (error) {
    logMessage(functionName, `Error creating student: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to create student' });
  }
};

export const getStudentByUserIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getStudentByUserIdController';
  try {
    const userId = Number(req.params.userId);
    logMessage(functionName, `Received request to fetch student for user ID: ${userId}`);
    const student = await getStudentByUserId(userId);
    logMessage(functionName, `Fetched student for user ID: ${userId}`);
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    logMessage(functionName, `Error fetching student: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};

export const getStudentByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getStudentByIdController';
  try {
    const studentId = Number(req.params.studentId);
    logMessage(functionName, `Received request to fetch student with ID: ${studentId}`);
    const student = await getStudentById(studentId);
    logMessage(functionName, `Fetched student with ID: ${studentId}`);
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    logMessage(functionName, `Error fetching student: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};
