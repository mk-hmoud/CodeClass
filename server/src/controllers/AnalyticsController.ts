import logger from '../config/logger';
import { Request, Response } from "express";
import { getAssignmentAnalytics, getClassroomAnalytics } from "../models/AnalyticsModel";
import { getAssignmentById } from "../models/AssignmentModel";
import { getInstructorByUserId } from "../models/InstructorModel";


export async function getClassroomAnalyticsController(req: Request, res: Response) {
  const fn = "getClassroomAnalyticsController";
  logger.info({ fn }, 'Received a request for classroom analytics');
  try {
    const classroomId = req.params.classroomId;
    if (!classroomId) {
      logger.warn({ fn, classroomId }, `Invalid classroom id: ${classroomId}`);
      res.status(400).json({ success: false, message: "Invalid classroom id" });
      return;
    }

    logger.info({ fn, classroomId }, `Fetching analytics for classroom ${classroomId}`);
    const payload = await getClassroomAnalytics(Number(classroomId));
    res.status(200).json({ success: true, data: payload });
  } catch (err) {
    logger.error({ fn, error: err }, `Error: ${err}`);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
}

export const getAssignmentAnalyticsController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getAssignmentAnalyticsController';
  try {
    logger.info({ fn: functionName }, 'Received request to get assignment analytics');
    
    if (req.user?.role !== "instructor") {
      logger.warn(
        { fn: functionName, userId: req.user?.id, role: req.user?.role },
        `User ${req.user?.id} is not an instructor`
      );
      res.status(403).json({ success: false, message: 'Forbidden: instructor role required' });
      return;
    }
    
    const assignmentId = parseInt(req.params.assignmentId);
    if (isNaN(assignmentId)) {
      logger.warn({ fn: functionName, rawAssignmentId: req.params.assignmentId }, 'Invalid assignment ID');
      res.status(400).json({ success: false, message: 'Invalid assignment ID' });
      return;
    }
    
    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) {
      logger.warn({ fn: functionName, assignmentId }, `Assignment ${assignmentId} not found`);
      res.status(404).json({ success: false, message: 'Assignment not found' });
      return;
    }
    
    
    const analytics = await getAssignmentAnalytics(assignmentId);
    
    logger.info({ fn: functionName, assignmentId }, `Successfully retrieved analytics for assignment ${assignmentId}`);
    res.status(200).json({ success: true, data: analytics });
    
  } catch (error) {
    logger.error({ fn: functionName, error }, `Error retrieving assignment analytics: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve assignment analytics' });
  }
};