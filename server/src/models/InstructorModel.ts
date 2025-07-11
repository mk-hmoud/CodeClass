import pool from "../config/db";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [InstructorModel.ts] [${functionName}] ${message}`);
};

export interface Instructor {
  instructor_id: number;
  user_id: number;
}

export const createInstructor = async (instructorData: Instructor): Promise<number> => {
  const functionName = "createInstructor";
  try {
    logMessage(functionName, "Creating instructor record.");
    const query = `
      INSERT INTO instructors (user_id)
      VALUES ($1)
      RETURNING instructor_id
    `;
    const result = await pool.query(query, [instructorData.user_id]);
    const instructorId: number = result.rows[0].instructor_id;
    logMessage(functionName, `Instructor created with ID: ${instructorId}.`);
    return instructorId;
  } catch (error) {
    logMessage(functionName, `Error creating instructor: ${error}`);
    throw error;
  }
};

export const getInstructorByUserId = async (userId: number): Promise<Instructor> => {
  const functionName = "getInstructorByUserId";
  try {
    logMessage(functionName, `Fetching instructor for user ID: ${userId}.`);
    const query = `SELECT * FROM instructors WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) {
      logMessage(functionName, "Instructor not found.");
      throw new Error("Instructor not found");
    }
    logMessage(functionName, "Instructor fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching instructor: ${error}`);
    throw error;
  }
};

export const getInstructorById = async (instructorId: number): Promise<Instructor> => {
  const functionName = "getInstructorById";
  try {
    logMessage(functionName, `Fetching instructor with ID: ${instructorId}.`);
    const query = `SELECT * FROM instructors WHERE instructor_id = $1`;
    const result = await pool.query(query, [instructorId]);
    if (result.rowCount === 0) {
      logMessage(functionName, "Instructor not found.");
      throw new Error("Instructor not found");
    }
    logMessage(functionName, "Instructor fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching instructor: ${error}`);
    throw error;
  }
};

export const getInstructorIdByClassroom = async (classroomId: number): Promise<number | null> => {
  const functionName = "getInstructorIdByClassroom";
  try {
    logMessage(functionName, `Fetching instructor ID for classroom ID: ${classroomId}.`);
    const query = `
      SELECT instructor_id
      FROM classrooms
      WHERE classroom_id = $1
    `;
    const result = await pool.query(query, [classroomId]);

    if (result.rowCount === 0) {
      logMessage(functionName, `Classroom with ID ${classroomId} not found.`);
      return null;
    }

    logMessage(functionName, `Instructor ID fetched successfully for classroom ID: ${classroomId}.`);
    return result.rows[0].instructor_id;
  } catch (error) {
    logMessage(functionName, `Error fetching instructor ID by classroom: ${error}`);
    throw error;
  }
};