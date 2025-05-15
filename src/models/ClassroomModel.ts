import pool from "../config/db";
import { Classroom, ClassroomStudent, Assignment } from "../types";
import { getAssignmentsForClassroom } from "./AssignmentModel";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [ClassroomModel.ts] [${functionName}] ${message}`);
};

export interface ClassroomCreationData {
  instructor_id: number;
  classroom_name: string;
  classroom_code: string;
}

export const createClassroom = async (
  data: Omit<Classroom, 'id' | 'created_at'>
): Promise<Classroom> => {
  const functionName = "createClassroom";
  try {
    logMessage(functionName, "Starting classroom creation.");
    const insertQuery = `
      INSERT INTO classrooms (instructor_id, classroom_name, classroom_code)
      VALUES ($1, $2, $3)
      RETURNING classroom_id, classroom_name, classroom_code, instructor_id, created_at
    `;
    const result = await pool.query(insertQuery, [
      data.instructor,
      data.name,
      data.code,
    ]);
    const row = result.rows[0];
    const classroom: Classroom = {
      id: row.classroom_id,
      name: row.classroom_name,
      code: row.classroom_code,
      instructor: String(row.instructor_id),
      announcements: [],
      discussions: [],
      active: true,
      completion: 0,
      created_at: row.created_at,
    };
    logMessage(functionName, `Classroom created with ID: ${classroom.id}.`);
    return classroom;
  } catch (error) {
    logMessage(functionName, `Error creating classroom: ${error}`);
    throw error;
  }
};

export const getInstructorClassroomById = async (classroomId: number): Promise<Classroom> => {
  const functionName = "getInstructorClassroomById";
  try {
    logMessage(functionName, `Fetching instructor classroom with ID: ${classroomId}`);
    const classroomRes = await pool.query(
      `SELECT classroom_id AS id, classroom_name AS name, classroom_code AS code, created_at 
       FROM classrooms 
       WHERE classroom_id = $1`,
      [classroomId]
    );
    if (classroomRes.rowCount === 0) throw new Error("Classroom not found");
    const classroomData = classroomRes.rows[0];

    const studentsRes = await pool.query(
      `SELECT u.email, CONCAT(u.first_name, ' ', u.last_name) AS name, ce.enrollment_date
       FROM classroom_enrollments ce
       JOIN students s ON ce.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       WHERE ce.classroom_id = $1`,
      [classroomId]
    );
    const students: ClassroomStudent[] = studentsRes.rows;

    const assignments: Assignment[] = await getAssignmentsForClassroom(classroomId);

    const instructorClassroom: Classroom = {
      id: classroomData.id,
      name: classroomData.name,
      code: classroomData.code,
      instructor: null,
      students: students,
      assignments: assignments,
      active: true,
      created_at: classroomData.created_at,
    };

    logMessage(functionName, "Instructor classroom fetched successfully.");
    return instructorClassroom;
  } catch (error) {
    logMessage(functionName, `Error: ${error}`);
    throw error;
  }
};

export const getStudentClassroomById = async (classroomId: number): Promise<Classroom> => {
  const functionName = "getStudentClassroomById";
  try {
    logMessage(functionName, `Fetching student classroom with ID: ${classroomId}`);
    const classroomRes = await pool.query(
      `SELECT classroom_id AS id, classroom_name AS name, classroom_code AS code, created_at 
       FROM classrooms 
       WHERE classroom_id = $1`,
      [classroomId]
    );
    if (classroomRes.rowCount === 0) throw new Error("Classroom not found");
    const classroomData = classroomRes.rows[0];

    const assignments: Assignment[] = await getAssignmentsForClassroom(classroomId);

    const studentClassroom: Classroom = {
      id: classroomData.id,
      name: classroomData.name,
      code: classroomData.code,
      assignments: assignments,
      created_at: classroomData.created_at,
    };

    logMessage(functionName, "Student classroom fetched successfully.");
    return studentClassroom;
  } catch (error) {
    logMessage(functionName, `Error: ${error}`);
    throw error;
  }
};

export const deleteClassroom = async (classroomId: number): Promise<void> => {
  const functionName = "deleteClassroom";
  try {
    logMessage(functionName, `Attempting to delete classroom with ID: ${classroomId}.`);
    const deleteQuery = `
      DELETE FROM classrooms
      WHERE classroom_id = $1
    `;
    await pool.query(deleteQuery, [classroomId]);
    logMessage(functionName, `Classroom with ID: ${classroomId} deleted successfully.`);
  } catch (error) {
    logMessage(functionName, `Error deleting classroom: ${error}`);
    throw error;
  }
};

export const assignAssignment = async (
  classroomId: number,
  problemId: number,
  due_date: string | null
): Promise<void> => {
  const functionName = "assignAssignment";
  try {
    logMessage(functionName, `Assigning problem ID ${problemId} to classroom ID ${classroomId}.`);
    const insertQuery = `
      INSERT INTO assignments (classroom_id, problem_id, due_date)
      VALUES ($1, $2, $3)
    `;
    await pool.query(insertQuery, [classroomId, problemId, due_date]);
    logMessage(functionName, `Problem ID ${problemId} assigned to classroom ID ${classroomId} successfully.`);
  } catch (error) {
    logMessage(functionName, `Error assigning assignment: ${error}`);
    throw error;
  }
};

export const getInstructorClassrooms = async (
  instructorId: number
): Promise<Classroom[]> => {
  const functionName = "getInstructorClassrooms";
  try {
    logMessage(functionName, `Fetching instructor classrooms for instructorId ${instructorId}.`);
    const query = `
      SELECT 
        c.classroom_id AS id,
        c.classroom_name AS name,
        c.classroom_code AS code,
        c.status AS status,
        COALESCE(e.student_count, 0) AS students,
        COALESCE(a.assignment_count, 0) AS assignments
      FROM classrooms c
      LEFT JOIN (
        SELECT classroom_id, COUNT(*) AS student_count
        FROM classroom_enrollments
        GROUP BY classroom_id
      ) e ON c.classroom_id = e.classroom_id
      LEFT JOIN (
        SELECT classroom_id, COUNT(*) AS assignment_count
        FROM assignments
        GROUP BY classroom_id
      ) a ON c.classroom_id = a.classroom_id
      WHERE c.instructor_id = $1;
    `;
    const result = await pool.query(query, [instructorId]);
    logMessage(functionName, `Fetched ${result.rows.length} instructor classrooms.`);
    return result.rows as Classroom[];
  } catch (error) {
    logMessage(functionName, `Failed to fetch instructor classrooms for instructorId ${instructorId}: ${error}`);
    return [];
  }
};

export const getStudentClassrooms = async (
  studentId: number
): Promise<Classroom[]> => {
  const fn = "getStudentClassrooms";
  try {
    logMessage(fn, `Fetching student classrooms for studentId ${studentId}.`);

    const query = `
      SELECT 
        c.classroom_id                    AS id,
        c.classroom_name                  AS name,
        c.classroom_code                  AS code,
        (u.first_name || ' ' || COALESCE(u.last_name, '')) AS instructor,

        COALESCE(a.assignment_count, 0)            AS "totalAssignments",
        COALESCE(sa.submitted_assignment_count, 0) AS "completedAssignments",
        COALESCE(a.assignment_count, 0)
          - COALESCE(sa.submitted_assignment_count, 0) AS "uncompletedAssignments",

        CASE 
          WHEN COALESCE(a.assignment_count, 0) = 0 THEN 0
          ELSE ROUND(
            COALESCE(sa.submitted_assignment_count, 0)::numeric
            * 100
            / a.assignment_count
          ) 
        END AS "completion"

      FROM classrooms c
      JOIN classroom_enrollments ce 
        ON c.classroom_id = ce.classroom_id
      JOIN instructors i 
        ON c.instructor_id = i.instructor_id
      JOIN users u 
        ON i.user_id = u.user_id

      LEFT JOIN (
        SELECT 
          classroom_id, 
          COUNT(*) AS assignment_count
        FROM assignments
        GROUP BY classroom_id
      ) a 
        ON c.classroom_id = a.classroom_id

      LEFT JOIN (
        SELECT 
          a.classroom_id,
          COUNT(DISTINCT a.assignment_id) AS submitted_assignment_count
        FROM assignments a
        JOIN submissions s 
          ON a.assignment_id = s.assignment_id
         AND s.student_id = $1
        GROUP BY a.classroom_id
      ) sa 
        ON c.classroom_id = sa.classroom_id

      WHERE ce.student_id = $1

      ORDER BY c.classroom_name;
    `;

    const result = await pool.query(query, [studentId]);
    logMessage(fn, `Fetched ${result.rows.length} student classrooms.`);

    return result.rows as unknown as Classroom[];
  } catch (error) {
    logMessage(
      fn,
      `Failed to fetch student classrooms for studentId ${studentId}: ${error}`
    );
    return [];
  }
};




export const joinClassroom = async (studentId: number, code: string): Promise<void> => {
  const functionName = 'joinClassroom';
  try {
    logMessage(functionName, `Student ${studentId} attempting to join with code ${code}.`);

    const classQuery = await pool.query(
      `SELECT classroom_id FROM classrooms WHERE classroom_code = $1`,
      [code]
    );
    if (classQuery.rowCount === 0) {
      throw new Error('INVALID_CODE');
    }
    const classroomId: number = classQuery.rows[0].classroom_id;

    const enrollQuery = await pool.query(
      `SELECT enrollment_id 
         FROM classroom_enrollments 
         WHERE classroom_id = $1 AND student_id = $2`,
      [classroomId, studentId]
    );
    if (enrollQuery.rowCount && enrollQuery.rowCount > 0) {
      throw new Error('ALREADY_ENROLLED');
    }

    await pool.query(
      `INSERT INTO classroom_enrollments (classroom_id, student_id) 
       VALUES ($1, $2)`,
      [classroomId, studentId]
    );
    logMessage(functionName, `Student ${studentId} enrolled in classroom ${classroomId}.`);
  } catch (error) {
    logMessage(functionName, `Error in joinClassroom: ${error}`);
    throw error;
  }
};

export const toggleClassroomStatus = async (classroomId: number): Promise<'active' | 'archived'> => {
  const { rows } = await pool.query< { new_status: 'active' | 'archived' } >(`
    UPDATE classrooms
      SET status = CASE WHEN status = 'active' THEN 'archived' ELSE 'active' END
    WHERE classroom_id = $1
    RETURNING status AS new_status
  `, [classroomId]);

  if (!rows.length) {
    throw new Error("Classroom not found");
  }

  return rows[0].new_status;
};
