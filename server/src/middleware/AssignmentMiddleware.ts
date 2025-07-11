import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AssignmentMiddleware] [${functionName}] ${message}`);
};

export const validateAssignment = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  const functionName = "validateAssignment";
  
  try {
    const { assignmentId } = req.params;
    
    if (!assignmentId) {
      logMessage(functionName, "Missing assignment ID");
      res.status(400).json({ error: "Missing assignment ID" });
      return; 
    }
    
    const result = await pool.query(
      'SELECT * FROM assignments WHERE assignment_id = $1',
      [assignmentId]
    );
    
    if (result.rowCount === 0) {
      logMessage(functionName, `Assignment not found: ${assignmentId}`);
      res.status(404).json({ error: "Assignment not found" });
      return; 
    }
    
    logMessage(functionName, `Validated assignment: ${assignmentId}`);
    next();
    
  } catch (error) {
    logMessage(functionName, `Validation error: ${error}`);
    res.status(500).json({ error: "Assignment validation failed" });
  }
};