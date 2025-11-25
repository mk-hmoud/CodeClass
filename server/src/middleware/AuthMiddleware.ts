import logger from '../config/logger';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';


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
  const fn = "authMiddleware";
  logger.debug({ fn, url: req.originalUrl }, "Auth middleware invoked");
  try {
    const authHeader = req.headers.authorization;
    logger.debug({ fn, authHeader }, "Authorization header received");

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn({ fn }, "Missing or invalid Authorization header");
      res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    logger.trace({ fn }, "Extracted token from Authorization header");
    
    
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      first_name?: string;
      last_name?: string;
      role: string;
      role_id: number;
    };
    
    logger.info({ fn, userId: decoded.id, role: decoded.role, role_id: decoded.role_id }, "Token verified successfully");    req.user = decoded;
    next();
  } catch (error) {
    logger.error({ fn, error }, "Error during token verification");
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
    return;
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const fn= "requireRole";
    logger.debug({ fn, requiredRoles: roles, user: req.user }, "Checking user roles");    
    
    if (!req.user) {
      logger.warn({ fn }, "No user found on request");
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(
        { fn, userId: req.user.id, role: req.user.role, allowedRoles: roles },
        "User role not authorized"
      );
      res.status(403).json({
        success: false,
        message: 'Forbidden: insufficient permissions'
      });
      return;
    }
    
    logger.info({ fn, userId: req.user.id, role: req.user.role }, "User role authorized");
    next();
  };
};

export default { authMiddleware, requireRole };
