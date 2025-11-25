import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';
import logger from '../config/logger';


export const validateAssignment = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  const fn = "validateAssignment";
  
  try {
    const { assignmentId } = req.params;
    
    if (!assignmentId) {
      logger.warn({ fn, url: req.originalUrl }, "Missing assignment ID");
      res.status(400).json({ error: "Missing assignment ID" });
      return; 
    }
    
    const result = await pool.query(
      'SELECT * FROM assignments WHERE assignment_id = $1',
      [assignmentId]
    );
    
    if (result.rowCount === 0) {
      logger.info({ fn, assignmentId }, "Assignment not found");
      res.status(404).json({ error: "Assignment not found" });
      return; 
    }
    
    logger.debug({ fn, assignmentId }, "Validated assignment");
    next();
    
  } catch (error) {
    logger.error({ fn, error }, "Assignment validation error");
    res.status(500).json({ error: "Assignment validation failed" });
  }
};