import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AuthMiddleware.ts] [${functionName}] ${message}`);
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        first_name?: string;
        last_name?: string;
        role: string;
        role_id: number;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const functionName = "authMiddleware";
  logMessage(functionName, `Invoked for URL: ${req.originalUrl}`);
  try {
    const authHeader = req.headers.authorization;
    logMessage(functionName, `Authorization header: ${authHeader}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logMessage(functionName, "Missing or invalid Authorization header");
      res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    logMessage(functionName, `Extracted token: ${token}`);
    
    
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      first_name?: string;
      last_name?: string;
      role: string;
      role_id: number;
    };
    
    logMessage(functionName, `Token verified successfully. Decoded payload: ${JSON.stringify(decoded)}`);
    req.user = decoded;
    next();
  } catch (error) {
    logMessage(functionName, `Error during token verification: ${error}`);
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
    return;
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const functionName = "requireRole";
    logMessage(functionName, `Checking roles for user: ${req.user ? JSON.stringify(req.user) : 'none'}`);
    
    if (!req.user) {
      logMessage(functionName, "No user found on request");
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      logMessage(functionName, `User role (${req.user.role}) not authorized. Allowed roles: ${roles.join(', ')}`);
      res.status(403).json({
        success: false,
        message: 'Forbidden: insufficient permissions'
      });
      return;
    }
    
    logMessage(functionName, `User role (${req.user.role}) is authorized`);
    next();
  };
};

export default { authMiddleware, requireRole };
