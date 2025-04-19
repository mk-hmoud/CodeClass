import pool from "../config/db";
import { Assignment } from "../types"

// Deprecated mostly.
const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AssignmentModel.ts] [${functionName}] ${message}`);
};

export const createAssignment = async (
  assignment: Assignment
): Promise<{ assignmentId: number }> => {
  const functionName = "createAssignment";
  try {
    logMessage(functionName, "Beginning transaction for assignment creation.");
    await pool.query("BEGIN");

    const insertAssignmentQuery = `
      INSERT INTO assignments (
        classroom_id,
        problem_id,
        difficulty_level,
        points,
        grading_method,
        submission_attempts,
        plagiarism_detection,
        publish_date,
        due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING assignment_id
    `;
    const assignmentResult = await pool.query(insertAssignmentQuery, [
      assignment.classroomId,
      assignment.problem.problemId,
      assignment.difficulty_level || null,
      assignment.points !== undefined ? assignment.points : null,
      assignment.grading_method,
      assignment.submission_attempts !== undefined
        ? assignment.submission_attempts
        : null,
      assignment.plagiarism_detection,
      assignment.publish_date || null,
      assignment.due_date || null,
    ]);
    const assignmentId: number = assignmentResult.rows[0].assignment_id;
    logMessage(functionName, `Inserted into assignments with ID: ${assignmentId}.`);

    if (assignment.languages && assignment.languages.length > 0) {
      const insertLanguageQuery = `
        INSERT INTO assignment_languages_pairs (assignment_id, language_id, initial_code)
        VALUES ($1, $2, $3)
      `;
      for (const lang of assignment.languages) {
        await pool.query(insertLanguageQuery, [
          assignmentId,
          lang.languageId,
          lang.initial_code || null,
        ]);
      }
      logMessage(functionName, "Inserted into assignment_languages_pairs.");
    }

    await pool.query("COMMIT");
    logMessage(functionName, "Transaction committed successfully.");
    return { assignmentId };
  } catch (error) {
    await pool.query("ROLLBACK");
    logMessage(functionName, `Transaction rolled back due to error: ${error}`);
    throw error;
  }
};

export const getAssignmentById = async (assignmentId: number): Promise<any> => {
  const functionName = "getAssignmentById";
  try {
    logMessage(functionName, `Fetching assignment with ID: ${assignmentId}.`);
    const assignmentQuery = `
      SELECT * FROM assignments WHERE assignment_id = $1
    `;
    const assignmentResult = await pool.query(assignmentQuery, [assignmentId]);
    if (assignmentResult.rowCount === 0) {
      logMessage(functionName, "Assignment not found.");
      throw new Error("Assignment not found");
    }
    const assignment = assignmentResult.rows[0];

    const metadataQuery = `
      SELECT * FROM assignment_metadata WHERE assignment_id = $1
    `;
    const metadataResult = await pool.query(metadataQuery, [assignmentId]);
    const metadata = metadataResult.rowCount ? metadataResult.rows[0] : null;

    const configQuery = `
      SELECT * FROM assignment_config WHERE assignment_id = $1
    `;
    const configResult = await pool.query(configQuery, [assignmentId]);
    const config = configResult.rowCount ? configResult.rows[0] : null;

    const languageQuery = `
      SELECT alp.*, l.name, l.version
      FROM assignment_languages_pairs alp
      JOIN languages l ON alp.language_id = l.language_id
      WHERE alp.assignment_id = $1
    `;
    const languageResult = await pool.query(languageQuery, [assignmentId]);
    const languages = languageResult.rows;

    const testCaseQuery = `
      SELECT * FROM assignment_test_cases WHERE assignment_id = $1
    `;
    const testCaseResult = await pool.query(testCaseQuery, [assignmentId]);
    const test_cases = testCaseResult.rows;

    logMessage(functionName, `Assignment with ID: ${assignmentId} fetched successfully.`);
    return {
      ...assignment,
      metadata,
      config,
      languages,
      test_cases,
    };
  } catch (error) {
    logMessage(functionName, `Error fetching assignment: ${error}`);
    throw error;
  }
};

export const deleteAssignment = async (assignmentId: number): Promise<void> => {
  const functionName = "deleteAssignment";
  try {
    logMessage(functionName, `Deleting assignment with ID: ${assignmentId}.`);
    const deleteQuery = `
      DELETE FROM assignments
      WHERE assignment_id = $1
    `;
    await pool.query(deleteQuery, [assignmentId]);
    logMessage(functionName, "Assignment deleted successfully.");
  } catch (error) {
    logMessage(functionName, `Error deleting assignment: ${error}`);
    throw error;
  }
};


export async function getAssignmentsForClassroom(classroomId: number): Promise<Assignment[]> {
  const query = `
    SELECT 
      a.assignment_id AS "assignmentId",
      a.classroom_id AS "classroomId",
      a.problem_id AS "problemId",
      a.difficulty_level AS "difficultyLevel",
      a.points,
      a.grading_method AS "gradingMethod",
      a.submission_attempts AS "submissionAttempts",
      a.plagiarism_detection AS "plagiarismDetection",
      to_char(a.assigned_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "assignedAt",
      to_char(a.publish_date, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "publishDate",
      to_char(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "dueDate",
      json_build_object(
        'problemId', p.problem_id,
        'instructorId', p.instructor_id,
        'title', p.title,
        'description', p.description,
        'category', p.category,
        'prerequisites', p.prerequisites,
        'learning_outcomes', p.learning_outcomes,
        'tags', p.tags,
        'createdAt', p.created_at,
        'testCases', (
           SELECT COALESCE(json_agg(
             json_build_object(
               'testCaseId', ptc.test_case_id,
               'input', ptc.input,
               'expectedOutput', ptc.expected_output,
               'isPublic', ptc.is_public
             )
           ), '[]'::json)
           FROM problem_test_cases ptc
           WHERE ptc.problem_id = p.problem_id
        )
      ) AS problem,
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'pairId', alp.pair_id,
            'assignmentId', alp.assignment_id,
            'languageId', alp.language_id,
            'initial_code', alp.initial_code,
            'name', l.name,
            'version', l.version
          )
        ), '[]'::json)
        FROM assignment_languages_pairs alp
        JOIN languages l ON alp.language_id = l.language_id
        WHERE alp.assignment_id = a.assignment_id
      ) AS languages
    FROM assignments a
    JOIN problems p ON a.problem_id = p.problem_id
    WHERE a.classroom_id = $1;
  `;
  try {
    const result = await pool.query(query, [classroomId]);
    return result.rows as Assignment[];
  } catch (error) {
    console.error("Error fetching assignments for classroom:", error);
    throw error;
  }
}


export const getAssignments = async (instructorId: number): Promise<Assignment[]> => {
  const functionName = 'getAssignments';
  try {
    logMessage(functionName, `Fetching assignments for instructor ID: ${instructorId}`);
    const query = `
      SELECT 
        a.assignment_id AS id,
        a.title,
        a.description,
        to_char(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS created_at,
        to_char(a.updated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS updated_at,
        json_build_object(
          'category', am.category,
          'difficulty_level', am.difficulty_level,
          'points', am.points,
          'prerequisites', am.prerequisites,
          'learning_outcomes', am.learning_outcomes,
          'tags', am.tags
        ) AS metadata,
        json_build_object(
          'grading_method', ac.grading_method,
          'submission_attempts', ac.submission_attempts,
          'plagiarism_detection', ac.plagiarism_detection
        ) AS config,
        (
          SELECT json_agg(
            json_build_object(
              'language_id', l.language_id,
              'name', l.name,
              'version', l.version,
              'initial_code', alp.initial_code
            )
          )
          FROM assignment_languages_pairs alp
          JOIN languages l ON alp.language_id = l.language_id
          WHERE alp.assignment_id = a.assignment_id
        ) AS languages,
        (
          SELECT json_agg(
            json_build_object(
              'test_case_id', atc.test_case_id,
              'input', atc.input,
              'expected_output', atc.expected_output,
              'is_public', atc.is_public
            )
          )
          FROM assignment_test_cases atc
          WHERE atc.assignment_id = a.assignment_id
        ) AS test_cases
      FROM assignments a
      LEFT JOIN assignment_metadata am ON a.assignment_id = am.assignment_id
      LEFT JOIN assignment_config ac ON a.assignment_id = ac.assignment_id
      JOIN instructor_assignments ia ON a.assignment_id = ia.assignment_id
      WHERE ia.instructor_id = $1
      ORDER BY a.created_at DESC;
    `;
    const result = await pool.query(query, [instructorId]);
    return result.rows as Assignment[];
  } catch (error) {
    logMessage(functionName, `Error fetching assignments for instructor: ${error}`);
    throw error;
  }
};
