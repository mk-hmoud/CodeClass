import pool from '../config/db';
import logger from "../config/logger";

export interface UserSummary {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
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

export async function getAllClassroomsAdmin() {
  const query = `
    SELECT 
      c.classroom_id, 
      c.classroom_name, 
      c.classroom_code, 
      c.status,
      c.created_at,
      u.email as instructor_email,
      COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') as instructor_name,
      (SELECT COUNT(*) FROM classroom_enrollments ce WHERE ce.classroom_id = c.classroom_id) as student_count,
      (SELECT COUNT(*) FROM assignments a WHERE a.classroom_id = c.classroom_id) as assignment_count
    FROM classrooms c
    JOIN instructors i ON c.instructor_id = i.instructor_id
    JOIN users u ON i.user_id = u.user_id
    ORDER BY c.created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function deleteClassroomAdmin(classroomId: number) {
  await pool.query('DELETE FROM classrooms WHERE classroom_id = $1', [classroomId]);
}

export async function getPlatformAnalytics() {
  const users = await pool.query('SELECT COUNT(*) as count FROM users');
  const classrooms = await pool.query('SELECT COUNT(*) as count FROM classrooms');
  const submissions = await pool.query('SELECT COUNT(*) as count FROM submissions');
  const activeClassrooms = await pool.query("SELECT COUNT(*) as count FROM classrooms WHERE status = 'active'");
  
  return {
    totalUsers: parseInt(users.rows[0].count),
    totalClassrooms: parseInt(classrooms.rows[0].count),
    activeClassrooms: parseInt(activeClassrooms.rows[0].count),
    totalSubmissions: parseInt(submissions.rows[0].count),
  };
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
}
