import pool from "../config/db";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [StudentModel.ts] [${functionName}] ${message}`);
};

export interface Student {
  student_id?: number;
  user_id: number;
}

export const createStudent = async (studentData: Student): Promise<number> => {
  const functionName = "createStudent";
  try {
    logMessage(functionName, "Creating student record.");
    const query = `
      INSERT INTO students (user_id)
      VALUES ($1)
      RETURNING student_id
    `;
    const result = await pool.query(query, [studentData.user_id]);
    const studentId: number = result.rows[0].student_id;
    logMessage(functionName, `Student created with ID: ${studentId}.`);
    return studentId;
  } catch (error) {
    logMessage(functionName, `Error creating student: ${error}`);
    throw error;
  }
};

export const getStudentByUserId = async (userId: number): Promise<Student> => {
  const functionName = "getStudentByUserId";
  try {
    logMessage(functionName, `Fetching student for user ID: ${userId}.`);
    const query = `SELECT * FROM students WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) {
      logMessage(functionName, "Student not found.");
      throw new Error("Student not found");
    }
    logMessage(functionName, "Student fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching student: ${error}`);
    throw error;
  }
};

export const getStudentById = async (studentId: number): Promise<Student> => {
  const functionName = "getStudentById";
  try {
    logMessage(functionName, `Fetching student with ID: ${studentId}.`);
    const query = `SELECT * FROM students WHERE student_id = $1`;
    const result = await pool.query(query, [studentId]);
    if (result.rowCount === 0) {
      logMessage(functionName, "Student not found.");
      throw new Error("Student not found");
    }
    logMessage(functionName, "Student fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching student: ${error}`);
    throw error;
  }
};
