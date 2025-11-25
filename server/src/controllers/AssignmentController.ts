import logger from '../config/logger';
import { Request, Response } from 'express';
import { createAssignment, getAssignments, getAssignmentById, deleteAssignment, getRemainingAttempts, getAssignmentForStudent, getUpcomingDeadlines } from '../models/AssignmentModel';
import { getInstructorByUserId } from '../models/InstructorModel';
import { getSubmissionsByAssignment } from '../models/SubmissionModel';


export const createAssignmentController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createAssignmentController';
  try {
    logger.info({ fn: functionName }, 'Received request to create assignment.');

    if (req.user?.role !== "instructor") {
      logger.warn(
        { fn: functionName, userId: req.user?.id, role: req.user?.role },
        `User ${req.user?.id} is not an instructor`
      );
      res.status(403).json({ success: false, message: 'Forbidden: instructor role required' });
      return;
    }

    const assignmentData = req.body;
    const result = await createAssignment(assignmentData);
    logger.info({ fn: functionName, assignmentId: result.assignmentId }, `Assignment created with ID: ${result.assignmentId}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Error creating assignment: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to create assignment' });
  }
};

export const getAssignmentByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getAssignmentByIdController';
  
  try {
    const assignmentId = Number(req.params.assignmentId);
    logger.info({ fn: functionName, assignmentId }, `Received request to fetch assignment ID: ${assignmentId}`);
    
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
    
    logger.info({ fn: functionName, assignmentId }, `Fetched assignment ID: ${assignmentId}`);
    
    res.status(200).json({
      success: true,
      data: {
        assignment,
        submissions: submissions
      }
    });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Error fetching assignment: ${error}`);
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
    logger.info({ fn: functionName, assignmentId }, `Received request to delete assignment ID: ${assignmentId}`);
    await deleteAssignment(assignmentId);
    logger.info({ fn: functionName, assignmentId }, `Deleted assignment ID: ${assignmentId}`);
    res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Error deleting assignment: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to delete assignment' });
  }
};


export const getAssignmentsController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getAssignmentsController';
  try {
    logger.info({ fn: functionName }, 'Received request to fetch assignments.');

    if (!req.user) {
      logger.warn({ fn: functionName }, 'No user information found in request.');
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
    logger.info(
      { fn: functionName, instructorId },
      `Fetched ${assignments.length} assignments for instructor ID: ${instructorId}`
    );
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Error fetching assignments: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};

export const getRemainingAttemptsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getRemainingAttemptsController";
  logger.info({ fn }, 'Received request to get remaining attempts.');

  try {
    if (!req.user) {
      logger.warn({ fn }, 'Unauthorized: No user information found in request.');
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    logger.debug(
      { fn, userId: req.user.id, role: req.user.role },
      `Checking user role. User ID: ${req.user.id}, Role: ${req.user.role}`
    );
    if (req.user.role !== "student") {
      
      logger.warn(
        { fn, userId: req.user.id, role: req.user.role },
        `Forbidden: User ${req.user.id} is not a student.`
      );
      res.status(403).json({ success: false, message: "Forbidden: Student role required" });
      return;
    }

    const assignmentId = Number(req.params.assignmentId);
    const studentId = req.user.role_id as number;
    
    logger.info(
      { fn, assignmentId, studentId },
      `Getting remaining attempts for assignment ${assignmentId} and student ${studentId}.`
    );

    if (isNaN(assignmentId) || assignmentId <= 0) {
        logger.warn(
          { fn, rawAssignmentId: req.params.assignmentId },
          `Invalid assignment ID received: ${req.params.assignmentId}`
        );
        res.status(400).json({ success: false, message: 'Invalid assignment ID' });
        logger.debug({ fn }, 'Sent 400 response.');
        return;
    }

    logger.debug({ fn }, 'Calling getRemainingAttempts model function.');
    const remaining = await getRemainingAttempts(assignmentId, studentId);
    logger.info(
      { fn, assignmentId, studentId, remaining },
      `Remaining attempts fetched: ${remaining} for assignment ${assignmentId}, student ${studentId}.`
    );

    res.status(200).json({ success: true, data: { remainingAttempts: remaining } });
    logger.debug({ fn }, 'Sent 200 response.');

  } catch (err) {
    logger.error({ fn, error: err }, `Error fetching remaining attempts: ${err}`);

     if (err instanceof Error && err.message === "Assignment not found") {
        res.status(404).json({ success: false, message: err.message });
        logger.debug({ fn }, 'Sent 404 response (Assignment not found).');
     } else {
        res.status(500).json({ success: false, message: "Could not fetch remaining attempts" });
        logger.debug({ fn }, 'Sent 500 response.');
     }
  }
};

export const getUpcomingDeadlinesController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getUpcomingDeadlinesController';
  try {
    logger.info({ fn: functionName }, 'Received request to get upcoming deadlines.');
    
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    
    if (!req.user?.id) {
      logger.warn({ fn: functionName }, 'User not authenticated');
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const assignments = await getUpcomingDeadlines(req.user.role_id, hours);
    
    logger.info(
      { fn: functionName, userId: req.user.role_id, hours, count: assignments.length },
      `Found ${assignments.length} upcoming assignments within ${hours} hours`
    );
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Error fetching upcoming deadlines: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming deadlines' });
  }
};