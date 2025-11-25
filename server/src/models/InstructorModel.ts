import pool from "../config/db";
import logger from "../config/logger";


export interface Instructor {
  instructor_id: number;
  user_id: number;
}

export const createInstructor = async (instructorData: Instructor): Promise<number> => {
  const functionName = "createInstructor";
  try {
    logger.info({ functionName, userId: instructorData.user_id }, "Creating instructor record.");
    const query = `
      INSERT INTO instructors (user_id)
      VALUES ($1)
      RETURNING instructor_id
    `;
    const result = await pool.query(query, [instructorData.user_id]);
    const instructorId: number = result.rows[0].instructor_id;
    logger.info({ functionName, instructorId }, `Instructor created with ID: ${instructorId}.`);
    return instructorId;
  } catch (error) {
    logger.error({ functionName, userId: instructorData.user_id, error }, `Error creating instructor: ${error}`);
    throw error;
  }
};

export const getInstructorByUserId = async (userId: number): Promise<Instructor> => {
  const functionName = "getInstructorByUserId";
  try {
    logger.info({ functionName, userId }, `Fetching instructor for user ID: ${userId}.`);
    const query = `SELECT * FROM instructors WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) {
      logger.warn({ functionName, userId }, "Instructor not found.");
      throw new Error("Instructor not found");
    }
    logger.info({ functionName, userId }, "Instructor fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logger.error({ functionName, userId, error }, `Error fetching instructor: ${error}`);
    throw error;
  }
};

export const getInstructorById = async (instructorId: number): Promise<Instructor> => {
  const functionName = "getInstructorById";
  try {
    logger.info({ functionName, instructorId }, `Fetching instructor with ID: ${instructorId}.`);
    const query = `SELECT * FROM instructors WHERE instructor_id = $1`;
    const result = await pool.query(query, [instructorId]);
    if (result.rowCount === 0) {
      logger.warn({ functionName, instructorId }, "Instructor not found.");
      throw new Error("Instructor not found");
    }
    logger.info({ functionName, instructorId }, "Instructor fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logger.error({ functionName, instructorId, error }, `Error fetching instructor: ${error}`);
    throw error;
  }
};

export const getInstructorIdByClassroom = async (classroomId: number): Promise<number | null> => {
  const functionName = "getInstructorIdByClassroom";
  try {
    logger.info(
      { functionName, classroomId },
      `Fetching instructor ID for classroom ID: ${classroomId}.`
    );
    const query = `
      SELECT instructor_id
      FROM classrooms
      WHERE classroom_id = $1
    `;
    const result = await pool.query(query, [classroomId]);

    if (result.rowCount === 0) {
      logger.warn(
        { functionName, classroomId },
        `Classroom with ID ${classroomId} not found.`
      );
      
      return null;
    }

    logger.info(
      { functionName, classroomId },
      `Instructor ID fetched successfully for classroom ID: ${classroomId}.`
    );
    return result.rows[0].instructor_id;
  } catch (error) {
    logger.error(
      { functionName, classroomId, error },
      `Error fetching instructor ID by classroom: ${error}`
    );
    throw error;
  }
};