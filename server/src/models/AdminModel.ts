import pool from '../config/db';
import logger from "../config/logger";

export interface UserSummary {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  username: string;
  role: 'admin' | 'instructor' | 'student';
  created_at: string;
}

export async function getAllUsers(): Promise<UserSummary[]> {
  const functionName = 'getAllUsers';
  logger.info({ fn: functionName }, `Fetching all users for admin`);
  try {
    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name,
        u.username,
        u.created_at,
        COALESCE(
          (SELECT 'admin' FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = u.user_id AND r.role_name = 'admin' LIMIT 1),
          (SELECT 'instructor' FROM instructors WHERE user_id = u.user_id), 
          (SELECT 'student' FROM students WHERE user_id = u.user_id),
          'student'
        ) as role
      FROM users u
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows as UserSummary[];
  } catch (error: any) {
    logger.error({ fn: functionName, error }, `Error fetching all users: ${error.message}`);
    throw error;
  }
}
