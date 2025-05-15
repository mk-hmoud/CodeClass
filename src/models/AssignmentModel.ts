import pool from "../config/db";
import { Assignment, AssignmentCreationData, Problem, TestCase, Language, AssignmentLanguage } from "../types"

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AssignmentModel.ts] [${functionName}] ${message}`);
};

export const createAssignment = async (
  assignment: AssignmentCreationData
): Promise<{ assignmentId: number }> => {
  const fn = "createAssignment";
  const client = await pool.connect();
  try {
    logMessage(fn, "Beginning transaction");
    await client.query("BEGIN");

    const insertSql = `
      INSERT INTO assignments (
        classroom_id,
        problem_id,
        title,
        description,
        difficulty_level,
        points,
        grading_method,
        max_submissions,
        plagiarism_detection,
        publish_date,
        due_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING assignment_id, title, description
    `;
    const {
      rows: [inserted],
    } = await client.query(insertSql, [
      assignment.classroomId,
      assignment.problemId,
      assignment.title || null,
      assignment.description || null,
      assignment.difficulty_level || null,
      assignment.points ?? null,
      assignment.grading_method,
      assignment.max_submissions ?? null,
      assignment.plagiarism_detection,
      assignment.publish_date || null,
      assignment.due_date || null,
    ]);

    const assignmentId: number = inserted.assignment_id;
    logMessage(fn, `Inserted assignment ${assignmentId}`);

    if (!inserted.title || !inserted.description) {
      const { rows: problemRows } = await client.query(
        `SELECT title, description FROM problems WHERE problem_id = $1`,
        [assignment.problemId]
      );
      if (problemRows.length) {
        const pb = problemRows[0];
        await client.query(
          `UPDATE assignments
             SET title       = COALESCE($1, title),
                 description = COALESCE($2, description)
           WHERE assignment_id = $3`,
          [
            inserted.title || pb.title,
            inserted.description || pb.description,
            assignmentId,
          ]
        );
        logMessage(fn, `Backfilled title/description from problem`);
      }
    }

    if (assignment.languages?.length) {
      const langSql = `
        INSERT INTO assignment_languages_pairs
          (assignment_id, language_id, initial_code)
        VALUES ($1,$2,$3)
      `;
      for (const { languageId, initial_code } of assignment.languages) {
        await client.query(langSql, [
          assignmentId,
          languageId,
          initial_code || null,
        ]);
      }
      logMessage(fn, "Inserted languages");
    }

    await client.query("COMMIT");
    logMessage(fn, "Transaction committed");
    return { assignmentId };
  } catch (err) {
    await client.query("ROLLBACK");
    logMessage(fn, `Rolled back due to error: ${err instanceof Error ? err.message : err}`);
    throw err;
  } finally {
    client.release();
  }
};



export const getAssignmentById = async (
  assignmentId: number
): Promise<Assignment> => {
  const fn = "getAssignmentById";
  try {
    logMessage(fn, `Fetching assignment ${assignmentId}`);
    const assignmentQuery = `
SELECT
        a.assignment_id,
        a.classroom_id,
        a.problem_id,
        a.difficulty_level,
        a.points,
        a.grading_method,
        a.max_submissions,
        a.plagiarism_detection,
        a.assigned_at,
        a.publish_date,
        a.due_date,
        a.status,                     
        p.title AS problem_title,
        p.description AS problem_description,
        p.category,
        COALESCE(p.prerequisites, '')   AS prerequisites,
        COALESCE(p.learning_outcomes,'') AS learning_outcomes,
        COALESCE(p.tags, '')            AS tags,
        p.created_at AS problem_created_at
      FROM assignments_with_status a 
      JOIN problems p
        ON a.problem_id = p.problem_id
      WHERE a.assignment_id = $1
    `;

    const resA = await pool.query(assignmentQuery, [assignmentId]);
    if (resA.rowCount === 0) {
      logMessage(fn, `Assignment ${assignmentId} not found`);
      throw new Error("Assignment not found");
    }
    const row = resA.rows[0];

    const languageQuery = `
      SELECT
        l.language_id,
        l.name,
        l.version,
        alp.initial_code
      FROM assignment_languages_pairs alp
      JOIN languages l
        ON alp.language_id = l.language_id
      WHERE alp.assignment_id = $1
      ORDER BY l.language_id
    `;
    const resL = await pool.query(languageQuery, [assignmentId]);
    const languages: AssignmentLanguage[] = resL.rows.map(r => ({
      language: {
        language_id: r.language_id,
        name: r.name,
        version: r.version ?? undefined
      },
      initial_code: r.initial_code ?? undefined
    }));

    const testCaseQuery = `
      SELECT
        test_case_id     AS "testCaseId",
        input            AS "input",
        expected_output  AS "expectedOutput",
        is_public        AS "isPublic"
      FROM problem_test_cases
      WHERE problem_id = $1
      ORDER BY test_case_id
    `;
    const resT = await pool.query(testCaseQuery, [row.problem_id]);
    const testCases: TestCase[] = resT.rows.map(r => ({
      testCaseId: r.testCaseId,
      input: r.input ?? undefined,
      expectedOutput: r.expectedOutput,
      isPublic: r.isPublic
    }));

    const assignment: Assignment = {
      assignmentId: row.assignment_id,
      classroomId: row.classroom_id,
      title: row.problem_title,
      description: row.problem_description,
      difficulty_level: row.difficulty_level as
        | "Easy"
        | "Medium"
        | "Hard"
        | undefined,
      points: row.points ?? undefined,
      grading_method: row.grading_method as "Manual" | "Automatic" | "Hybrid",
      max_submissions: row.max_submissions?? undefined,
      plagiarism_detection: row.plagiarism_detection,
      assigned_at: new Date(row.assigned_at),
      publish_date: row.publish_date ? new Date(row.publish_date) : undefined,
      due_date: row.due_date ? new Date(row.due_date) : undefined,
      languages,
      completed: false,
      status:       row.status as "not_published"|"active"|"expired",

      problem: {
        problemId: row.problem_id,
        title: row.problem_title,
        description: row.problem_description,
        category: row.category ?? undefined,
        prerequisites: row.prerequisites ?? undefined,
        learning_outcomes: row.learning_outcomes ?? undefined,
        tags: row.tags ?? undefined,
        created_at: new Date(row.problem_created_at),
        testCases: testCases,
      }
    };

    logMessage(fn, `Fetched assignment ${assignmentId} successfully`);
    return assignment;
  } catch (err) {
    logMessage(fn, `Error in ${fn}: ${err}`);
    throw err;
  }
};

export const getAssignmentForStudent = async (
  assignmentId: number
): Promise<Assignment> => {
  const fn = "getAssignmentForStudent";
  try {
    logMessage(fn, `Loading assignment ${assignmentId} for student view`);
    const a = await getAssignmentById(assignmentId);

    const beforeCount = a.problem.testCases.length;
    a.problem.testCases = a.problem.testCases.filter((tc) => tc.isPublic);
    const afterCount = a.problem.testCases.length;
    logMessage(
      fn,
      `Filtered test cases: ${beforeCount} → ${afterCount} public only`
    );

    delete (a as any).grading_method;
    delete (a as any).assigned_at;
    delete (a as any).plagiarism_detection;
    logMessage(fn, `Stripped instructor-only fields from assignment object`);

    logMessage(fn, `Returning assignment ${assignmentId} to student`);
    return a;
  } catch (err) {
    logMessage(fn, `Error in getAssignmentForStudent: ${(err as Error).message}`);
    throw err;
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
      a.title,
      a.description,
      a.difficulty_level AS "difficultyLevel",
      a.points,
      a.grading_method AS "gradingMethod",
      a.max_submissions AS "submissionAttempts",
      a.plagiarism_detection AS "plagiarismDetection",
      to_char(a.assigned_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "assignedAt",
      to_char(a.publish_date, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "publishDate",
      to_char(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "dueDate",
      a.status AS "status",
      json_build_object(
        'problemId', p.problem_id,
        'instructorId', p.instructor_id,
        'title', p.title,
        'description', p.description,
        'category', p.category,
        'prerequisites', p.prerequisites,
        'learning_outcomes', p.learning_outcomes,
        'tags', p.tags,
        'created_at', p.created_at,
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
    FROM assignments_with_status a 
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

export async function getAssignmentsForStudentClassroom(
  classroomId: number,
  studentId: number
): Promise<Assignment[]> {
  const query = `
    SELECT 
      a.assignment_id AS "assignmentId",
      a.classroom_id AS "classroomId",
      a.problem_id AS "problemId",
      a.title,
      a.description,
      a.difficulty_level AS "difficultyLevel",
      a.points,
      a.grading_method AS "gradingMethod",
      a.max_submissions AS "submissionAttempts",
      a.plagiarism_detection AS "plagiarismDetection",
      to_char(a.assigned_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "assignedAt",
      to_char(a.publish_date, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "publishDate",
      to_char(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS "dueDate",
      a.status AS "status",
      EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.assignment_id = a.assignment_id
        AND s.student_id = $2
      ) AS "submitted",
      json_build_object(
        'problemId', p.problem_id,
        'instructorId', p.instructor_id,
        'title', p.title,
        'description', p.description,
        'category', p.category,
        'prerequisites', p.prerequisites,
        'learning_outcomes', p.learning_outcomes,
        'tags', p.tags,
        'created_at', p.created_at,
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
    FROM assignments_with_status a 
    JOIN problems p ON a.problem_id = p.problem_id
    WHERE a.classroom_id = $1;
  `;
  try {
    const result = await pool.query(query, [classroomId, studentId]);
    return result.rows as Assignment[];
  } catch (error) {
    console.error("Error fetching assignments:", error);
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
        a.status AS status,
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
          'max_submissions', ac.max_submissions,
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
      FROM assignments_with_status a
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

export async function getRemainingAttempts(
  assignmentId: number,
  studentId: number
): Promise<number> {
  const functionName = "getRemainingAttempts";
  logMessage(functionName, `Checking remaining attempts for assignment ${assignmentId} and student ${studentId}`);
  
  try {
    logMessage(functionName, `Getting max submission attempts for assignment ${assignmentId}`);
    const assignRes = await pool.query<{
      max_submissions: number | null;
    }>(
      `SELECT max_submissions
       FROM assignments
       WHERE assignment_id = $1`,
      [assignmentId]
    );
    
    if (assignRes.rowCount === 0) {
      logMessage(functionName, `Assignment ${assignmentId} not found`);
      throw new Error("Assignment not found");
    }
    
    const maxAttempts = assignRes.rows[0].max_submissions as number;
    logMessage(functionName, `Max attempts for assignment ${assignmentId}: ${maxAttempts === null ? 'Unlimited' : maxAttempts}`);
    
    if (maxAttempts === null) {
      logMessage(functionName, `Returning unlimited attempts (Infinity) for assignment ${assignmentId}`);
      return Infinity;
    }
    
    logMessage(functionName, `Counting submission attempts for assignment ${assignmentId} and student ${studentId}`);
    const countRes = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt
       FROM submission_attempts
       WHERE assignment_id = $1
       AND student_id = $2`,
      [assignmentId, studentId]
    );
    
    const used = parseInt(countRes.rows[0].cnt, 10);
    logMessage(functionName, `Used attempts for assignment ${assignmentId} by student ${studentId}: ${used}`);
    
    const remaining = Math.max(0, maxAttempts - used);
    logMessage(functionName, `Remaining attempts calculated: ${remaining}`);
    
    return remaining;
  } catch (error) {
    logMessage(functionName, `Error in ${functionName} for assignment ${assignmentId}, student ${studentId}: ${error}`);
    throw error;
  }
}


export async function getSubmissionAttemptCount(
  assignmentId: number,
  studentId: number
): Promise<number> {
  const functionName = "getSubmissionAttemptCount";
  logMessage(functionName, `Getting submission attempt count for assignment ${assignmentId} and student ${studentId}`);
  
  try {
    const result = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt
       FROM submission_attempts
       WHERE assignment_id = $1
       AND student_id = $2`,
      [assignmentId, studentId]
    );
    
    const count = parseInt(result.rows[0].cnt, 10);
    logMessage(functionName, `Found ${count} submission attempts`);
    
    return count;
  } catch (error) {
    logMessage(functionName, `Error in ${functionName} for assignment ${assignmentId}, student ${studentId}: ${error}`);
    throw error;
  }
}

export const getUpcomingDeadlines = async (
  studentId: number,
  hours: number = 24
): Promise<any[]> => {
  const fn = "getUpcomingDeadlines";
  try {
    logMessage(fn, `Getting assignments with deadlines within ${hours}h for student ${studentId}`);

    const now = new Date();
    const threshold = new Date(now);
    threshold.setHours(threshold.getHours() + hours);

    const query = `
      SELECT
        a.assignment_id,
        a.title,
        a.due_date,
        a.points,
        a.difficulty_level,
        a.max_submissions,
        c.classroom_name   AS course,
        COALESCE(p.submission_count, 0) AS submission_count
      FROM assignments a
      JOIN classrooms c
        ON a.classroom_id = c.classroom_id
      JOIN classroom_enrollments ce
        ON c.classroom_id = ce.classroom_id
      LEFT JOIN (
        SELECT
          assignment_id,
          COUNT(*) AS submission_count
        FROM submissions
        WHERE student_id = $1
        GROUP BY assignment_id
      ) p
        ON a.assignment_id = p.assignment_id
      WHERE
        ce.student_id = $1
        AND a.due_date > $2
        AND a.due_date <= $3
      ORDER BY a.due_date ASC
    `;

    const result = await pool.query(query, [
      studentId,
      now,
      threshold,
    ]);

    const upcoming = result.rows.map((row) => {
      let status = "Not Started";
      const count = Number(row.submission_count);
      if (count > 0) {
        status = count >= row.max_submissions ? "Completed" : "In Progress";
      }
      return {
        id:         row.assignment_id,
        title:      row.title,
        course:     row.course,
        dueDate:    row.due_date,
        status,
        points:     row.points,
        difficulty: row.difficulty_level,
      };
    });

    logMessage(fn, `Found ${upcoming.length} upcoming assignments`);
    return upcoming;
  } catch (err: any) {
    logMessage(fn, `Error getting upcoming deadlines: ${err.message || err}`);
    throw err;
  }
};
