import { Request, Response } from 'express';
import { createAssignment, getAssignments, getAssignmentById, deleteAssignment, getRemainingAttempts, getAssignmentForStudent, getUpcomingDeadlines } from '../models/AssignmentModel';
import { getInstructorByUserId } from '../models/InstructorModel';
import { getSubmissionsByAssignment } from '../models/SubmissionModel';

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
    
    let assignment;
    let submissions = null;
    
    if (req.user?.role === "student") {
      assignment = await getAssignmentForStudent(assignmentId);
    } else {
      assignment = await getAssignmentById(assignmentId);
      
      if (req.user?.role === "instructor") {
        submissions = await getSubmissionsByAssignment(assignmentId);
      }
    }
    
    logMessage(functionName, `Fetched assignment ID: ${assignmentId}`);
    
    res.status(200).json({
      success: true,
      data: {
        assignment,
        submissions: submissions
      }
    });
  } catch (error) {
    logMessage(functionName, `Error fetching assignment: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment'
    });
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

export const getRemainingAttemptsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getRemainingAttemptsController";
  logMessage(fn, `Received request to get remaining attempts.`);

  try {
    if (!req.user) {
        logMessage(fn, "Unauthorized: No user information found in request.");
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    logMessage(fn, `Checking user role. User ID: ${req.user.id}, Role: ${req.user.role}`);
    if (req.user.role !== "student") {
      logMessage(fn, `Forbidden: User ${req.user.id} is not a student.`);
      res.status(403).json({ success: false, message: "Forbidden: Student role required" });
      return;
    }

    const assignmentId = Number(req.params.assignmentId);
    const studentId = req.user.role_id as number;
    logMessage(fn, `Getting remaining attempts for assignment ${assignmentId} and student ${studentId}.`);

    if (isNaN(assignmentId) || assignmentId <= 0) {
        logMessage(fn, `Invalid assignment ID received: ${req.params.assignmentId}`);
        res.status(400).json({ success: false, message: 'Invalid assignment ID' });
        logMessage(fn, 'Sent 400 response.');
        return;
    }

    logMessage(fn, `Calling getRemainingAttempts model function.`);
    const remaining = await getRemainingAttempts(assignmentId, studentId);
    logMessage(fn, `Remaining attempts fetched: ${remaining} for assignment ${assignmentId}, student ${studentId}.`);

    res.status(200).json({ success: true, data: { remainingAttempts: remaining } });
    logMessage(fn, 'Sent 200 response.');

  } catch (err) {
    logMessage(fn, `Error fetching remaining attempts: ${err}`);

     if (err instanceof Error && err.message === "Assignment not found") {
        res.status(404).json({ success: false, message: err.message });
        logMessage(fn, 'Sent 404 response (Assignment not found).');
     } else {
        res.status(500).json({ success: false, message: "Could not fetch remaining attempts" });
        logMessage(fn, 'Sent 500 response.');
     }
  }
};

export const getUpcomingDeadlinesController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getUpcomingDeadlinesController';
  try {
    logMessage(functionName, 'Received request to get upcoming deadlines.');
    
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    
    if (!req.user?.id) {
      logMessage(functionName, 'User not authenticated');
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const assignments = await getUpcomingDeadlines(req.user.id, hours);
    
    logMessage(functionName, `Found ${assignments.length} upcoming assignments within ${hours} hours`);
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    logMessage(functionName, `Error fetching upcoming deadlines: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming deadlines' });
  }
};