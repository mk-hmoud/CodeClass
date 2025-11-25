import pool from "../config/db";
import logger from "../config/logger";


export interface Student {
  student_id?: number;
  user_id: number;
}

export const createStudent = async (studentData: Student): Promise<number> => {
  const functionName = "createStudent";
  try {
    logger.info(
      { functionName, userId: studentData.user_id },
      "Creating student record."
    );
    const query = `
      INSERT INTO students (user_id)
      VALUES ($1)
      RETURNING student_id
    `;
    const result = await pool.query(query, [studentData.user_id]);
    const studentId: number = result.rows[0].student_id;
    logger.info({ functionName, studentId }, `Student created with ID: ${studentId}.`);
    return studentId;
  } catch (error) {
    logger.error(
      { functionName, userId: studentData.user_id, error },
      `Error creating student: ${error}`
    );
    throw error;
  }
};

export const getStudentByUserId = async (userId: number): Promise<Student> => {
  const functionName = "getStudentByUserId";
  try {
    logger.info({ functionName, userId }, `Fetching student for user ID: ${userId}.`);
    const query = `SELECT * FROM students WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) {
      logger.warn({ functionName, userId }, "Student not found.");
      throw new Error("Student not found");
    }
    logger.info({ functionName, userId }, "Student fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logger.error({ functionName, userId, error }, `Error fetching student: ${error}`);
    throw error;
  }
};

export const getStudentById = async (studentId: number): Promise<Student> => {
  const functionName = "getStudentById";
  try {
    logger.info({ functionName, studentId }, `Fetching student with ID: ${studentId}.`);
    const query = `SELECT * FROM students WHERE student_id = $1`;
    const result = await pool.query(query, [studentId]);
    if (result.rowCount === 0) {
      logger.warn({ functionName, studentId }, "Student not found.");
      throw new Error("Student not found");
    }
    logger.info({ functionName, studentId }, "Student fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logger.error({ functionName, studentId, error }, `Error fetching student: ${error}`);
    throw error;
  }
};
