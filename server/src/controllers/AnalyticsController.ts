import { Request, Response } from "express";
import { getAssignmentAnalytics, getClassroomAnalytics } from "../models/AnalyticsModel";
import { getAssignmentById } from "../models/AssignmentModel";
import { getInstructorByUserId } from "../models/InstructorModel";

const logMessage = (fn: string, msg: string) => {
  console.log(`[${new Date().toISOString()}] [AnalyticsController] [${fn}] ${msg}`);
};

export async function getClassroomAnalyticsController(req: Request, res: Response) {
  const fn = "getClassroomAnalyticsController";
  logMessage(fn, `Received a request for classroom analytics`);
  try {
    const classroomId = req.params.classroomId;
    if (!classroomId) {
      logMessage(fn, `Invalid classroom id:  ${classroomId}`);
      res.status(400).json({ success: false, message: "Invalid classroom id" });
      return;
    }

    logMessage(fn, `Fetching analytics for classroom ${classroomId}`);
    const payload = await getClassroomAnalytics(Number(classroomId));
    res.status(200).json({ success: true, data: payload });
  } catch (err) {
    logMessage(fn, `Error: ${err}`);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
}

export const getAssignmentAnalyticsController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getAssignmentAnalyticsController';
  try {
    logMessage(functionName, 'Received request to get assignment analytics');
    
    if (req.user?.role !== "instructor") {
      logMessage(functionName, `User ${req.user?.id} is not an instructor`);
      res.status(403).json({ success: false, message: 'Forbidden: instructor role required' });
      return;
    }
    
    const assignmentId = parseInt(req.params.assignmentId);
    if (isNaN(assignmentId)) {
      logMessage(functionName, 'Invalid assignment ID');
      res.status(400).json({ success: false, message: 'Invalid assignment ID' });
      return;
    }
    
    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) {
      logMessage(functionName, `Assignment ${assignmentId} not found`);
      res.status(404).json({ success: false, message: 'Assignment not found' });
      return;
    }
    
    
    const analytics = await getAssignmentAnalytics(assignmentId);
    
    logMessage(functionName, `Successfully retrieved analytics for assignment ${assignmentId}`);
    res.status(200).json({ success: true, data: analytics });
    
  } catch (error) {
    logMessage(functionName, `Error retrieving assignment analytics: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve assignment analytics' });
  }
};