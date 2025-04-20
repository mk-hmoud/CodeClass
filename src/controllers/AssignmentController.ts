import { Request, Response } from 'express';
import { createAssignment, getAssignments, getAssignmentById, deleteAssignment } from '../models/AssignmentModel';
import { getInstructorByUserId } from '../models/InstructorModel';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AssignmentController.ts] [${functionName}] ${message}`);
};

export const createAssignmentController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createAssignmentController';
  try {
    logMessage(functionName, 'Received request to create assignment.');

    if (req.user?.role !== "instructor") {
      logMessage(functionName, `User ${req.user?.id} is not an instructor`);
      res.status(403).json({ success: false, message: 'Forbidden: instructor role required' });
      return;
    }

    const assignmentData = req.body;
    const result = await createAssignment(assignmentData);
    logMessage(functionName, `Assignment created with ID: ${result.assignmentId}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logMessage(functionName, `Error creating assignment: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to create assignment' });
  }
};

export const getAssignmentByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getAssignmentByIdController';
  try {
    const assignmentId = Number(req.params.assignmentId);
    logMessage(functionName, `Received request to fetch assignment ID: ${assignmentId}`);
    const assignment = await getAssignmentById(assignmentId);
    logMessage(functionName, `Fetched assignment ID: ${assignmentId}`);
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    logMessage(functionName, `Error fetching assignment: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch assignment' });
  }
};

export const deleteAssignmentController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'deleteAssignmentController';
  try {
    const assignmentId = Number(req.params.assignmentId);
    logMessage(functionName, `Received request to delete assignment ID: ${assignmentId}`);
    await deleteAssignment(assignmentId);
    logMessage(functionName, `Deleted assignment ID: ${assignmentId}`);
    res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    logMessage(functionName, `Error deleting assignment: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to delete assignment' });
  }
};


export const getAssignmentsController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getAssignmentsController';
  try {
    logMessage(functionName, 'Received request to fetch assignments.');

    if (!req.user) {
      logMessage(functionName, "No user information found in request.");
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const instructor = await getInstructorByUserId(req.user?.id);
    if (!instructor) {
      res.status(401).json({ success: false, message: 'Unauthorized: Instructor not identified' });
      return;
    }
    const instructorId = instructor.instructor_id;

    const assignments = await getAssignments(instructorId);
    logMessage(functionName, `Fetched ${assignments.length} assignments for instructor ID: ${instructorId}`);
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    logMessage(functionName, `Error fetching assignments: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};