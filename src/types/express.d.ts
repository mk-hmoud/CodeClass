import { Request } from "express";

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