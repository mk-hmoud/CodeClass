import pool from "../config/db";
import logger from "../config/logger";
import { Assignment, AssignmentCreationData, AssignmentProblem, Problem, TestCase, Language, AssignmentLanguage } from "../types"
import { isGradeVisible } from "../utils/gradeVisibility";

/**
 * What a student is allowed to see of an assignment aliased `a`: it has
 * published, and it is either ungrouped or scoped to that student's own lab
 * group. `studentParam` is the placeholder holding the student id ("$1", "$2").
 *
 * One fragment rather than four copies: the list, the classroom totals, the
 * deadline feed and every by-id path all need the same rule, and the group half
 * previously lived only in the list -- so the list hid other groups' variants
 * while fetching one by id, submitting to it, or reading the deadline feed
 * returned it anyway. That is the leak per-group assignments exist to prevent.
 */
export const studentVisibleAssignmentSql = (studentParam: string): string => `
  (a.publish_date IS NULL OR a.publish_date <= NOW())
  AND (
    a.group_id IS NULL
    OR a.group_id = (
      SELECT lge.group_id
        FROM lab_group_enrollments lge
       WHERE lge.classroom_id = a.classroom_id
         AND lge.student_id = ${studentParam}
    )
  )
`;

/**
 * Whether this student may read or submit to this assignment: enrolled in its
 * classroom, and the assignment passes studentVisibleAssignmentSql.
 */
export const canStudentAccessAssignment = async (
  assignmentId: number,
  studentId: number
): Promise<boolean> => {
  const fn = "canStudentAccessAssignment";
  try {
    const { rowCount } = await pool.query(
      `SELECT 1
         FROM assignments a
         JOIN classroom_enrollments ce
           ON ce.classroom_id = a.classroom_id
          AND ce.student_id = $2
        WHERE a.assignment_id = $1
          AND ${studentVisibleAssignmentSql("$2")}`,
      [assignmentId, studentId]
    );
    return (rowCount ?? 0) > 0;
  } catch (error) {
    logger.error({ fn, assignmentId, studentId, error }, `Error checking assignment access: ${error}`);
    throw error;
  }
};

export const createAssignment = async (
  assignment: AssignmentCreationData
): Promise<{ assignmentId: number }> => {
  const fn = "createAssignment";
  const client = await pool.connect();
  try {
    logger.debug({ fn }, 'Beginning transaction');
    await client.query("BEGIN");

    // Normalise to a problem set. A legacy single-problem payload (just
    // problemId + top-level languages) becomes the one-element case; the
    // assignment row's problem_id stays the primary (first) problem.
    const problemSet = (assignment.problems && assignment.problems.length)
      ? assignment.problems.map((p, i) => ({
          problemId: p.problemId,
          points: p.points ?? assignment.points ?? 100,
          position: p.position ?? i,
          languages: p.languages,
          libraryId: p.libraryId ?? null,
        }))
      : [{
          problemId: assignment.problemId,
          points: assignment.points ?? 100,
          position: 0,
          languages: assignment.languages,
          libraryId: assignment.libraryId ?? null,
        }];
    const primaryProblemId = problemSet[0].problemId;

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
        due_date,
        library_id,
        group_id,
        grade_release_mode
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING assignment_id, title, description
    `;
    const {
      rows: [inserted],
    } = await client.query(insertSql, [
      assignment.classroomId,
      primaryProblemId,
      assignment.title || null,
      assignment.description || null,
      assignment.difficulty_level || null,
      assignment.points ?? null,
      assignment.grading_method,
      assignment.max_submissions ?? null,
      assignment.plagiarism_detection,
      assignment.publish_date || null,
      assignment.due_date || null,
      assignment.libraryId ?? null,
      assignment.groupId ?? null,
      assignment.grade_release_mode || "immediate",
    ]);

    const assignmentId: number = inserted.assignment_id;
    logger.info({ fn, assignmentId }, `Inserted assignment ${assignmentId}`);

    if (!inserted.title || !inserted.description) {
      const { rows: problemRows } = await client.query(
        `SELECT title, description FROM problems WHERE problem_id = $1`,
        [primaryProblemId]
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
        logger.debug({ fn, assignmentId }, 'Backfilled title/description from problem');
      }
    }

    // The ordered problem set, plus each problem's own starter code.
    const apSql = `
      INSERT INTO assignment_problems (assignment_id, problem_id, points, position, library_id)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (assignment_id, problem_id) DO UPDATE
        SET points = EXCLUDED.points, position = EXCLUDED.position, library_id = EXCLUDED.library_id
    `;
    const langSql = `
      INSERT INTO assignment_languages_pairs
        (assignment_id, problem_id, language_id, initial_code)
      VALUES ($1,$2,$3,$4)
    `;
    for (const p of problemSet) {
      await client.query(apSql, [assignmentId, p.problemId, p.points, p.position, p.libraryId ?? null]);
      if (p.languages?.length) {
        for (const { languageId, initial_code } of p.languages) {
          await client.query(langSql, [assignmentId, p.problemId, languageId, initial_code || null]);
        }
      }
    }
    logger.debug({ fn, assignmentId, problemCount: problemSet.length }, 'Inserted problem set + languages');

    if (assignment.groupId && assignment.testCaseOverrides?.length) {
      const overrideSql = `
        INSERT INTO group_test_case_overrides (test_case_id, group_id, input, expected_output)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (test_case_id, group_id) DO UPDATE
          SET input = EXCLUDED.input, expected_output = EXCLUDED.expected_output
      `;
      for (const override of assignment.testCaseOverrides) {
        await client.query(overrideSql, [
          override.testCaseId,
          assignment.groupId,
          override.input ?? null,
          override.expectedOutput ?? null,
        ]);
      }
      logger.debug({ fn, assignmentId }, 'Inserted test case overrides');
    }

    await client.query("COMMIT");
    logger.info({ fn, assignmentId }, 'Transaction committed');
    return { assignmentId };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ fn, err }, 'Rolled back transaction due to error');
    throw err;
  } finally {
    client.release();
  }
};



/** A problem's test cases within an assignment (group override + schema lib
 *  resolved the same way the primary-problem query does). */
const loadProblemTestCases = async (problemId: number, groupId: number | null): Promise<TestCase[]> => {
  const { rows } = await pool.query(
    `SELECT
       tc.test_case_id                                   AS "testCaseId",
       COALESCE(gto.input, sl.setup_sql, tc.input, '')   AS "input",
       COALESCE(gto.expected_output, tc.expected_output, '') AS "expectedOutput",
       tc.is_public                                      AS "isPublic",
       tc.stdin                                          AS "stdin",
       tc.env                                            AS "env",
       tc.compare                                        AS "compare"
     FROM problem_test_cases tc
     LEFT JOIN group_test_case_overrides gto
       ON gto.test_case_id = tc.test_case_id AND gto.group_id = $2
     LEFT JOIN schema_libraries sl
       ON sl.schema_library_id = tc.schema_library_id
     WHERE tc.problem_id = $1
     ORDER BY tc.test_case_id`,
    [problemId, groupId]
  );
  return rows.map((r: any) => ({
    testCaseId: r.testCaseId,
    input: r.input ?? undefined,
    expectedOutput: r.expectedOutput,
    isPublic: r.isPublic,
    stdin: r.stdin ?? undefined,
    env: r.env ?? undefined,
    compare: r.compare ?? undefined,
  }));
};

/** A systems problem's student-visible files (hidden files excluded). */
const loadProblemFiles = async (problemId: number) => {
  const { rows } = await pool.query(
    `SELECT path, content, role FROM problem_files
       WHERE problem_id = $1 AND role IN ('template','readonly')
       ORDER BY role, path`,
    [problemId]
  );
  return rows.map((f: any) => ({ path: f.path, content: f.content, role: f.role }));
};

/** A problem's starter code within an assignment. */
const loadProblemLanguages = async (assignmentId: number, problemId: number): Promise<AssignmentLanguage[]> => {
  const { rows } = await pool.query(
    `SELECT l.language_id, l.name, l.version, alp.initial_code
       FROM assignment_languages_pairs alp
       JOIN languages l ON alp.language_id = l.language_id
      WHERE alp.assignment_id = $1 AND alp.problem_id = $2
      ORDER BY l.language_id`,
    [assignmentId, problemId]
  );
  return rows.map((r: any) => ({
    language: { language_id: r.language_id, name: r.name, version: r.version ?? undefined },
    initial_code: r.initial_code ?? undefined,
  }));
};

export const getAssignmentById = async (
  assignmentId: number
): Promise<Assignment> => {
  const fn = "getAssignmentById";
  try {
    logger.info({ fn, assignmentId }, `Fetching assignment ${assignmentId}`);
    const assignmentQuery = `
      SELECT
       a.assignment_id,
       a.classroom_id,
       a.problem_id,
       a.group_id,
       COALESCE(a.title, p.title)           AS assignment_title,
       COALESCE(a.description, p.description) AS assignment_description,
       a.difficulty_level,
       a.points,
       a.grading_method,
       a.max_submissions,
       a.plagiarism_detection,
       a.assigned_at,
       a.publish_date,
       a.due_date,
       a.status,
       p.title           AS problem_title,
       p.description     AS problem_description,
        p.category,
        COALESCE(p.prerequisites, '')   AS prerequisites,
        COALESCE(p.learning_outcomes,'') AS learning_outcomes,
        COALESCE(p.tags, '')            AS tags,
        p.created_at AS problem_created_at,
        p.output_type AS "problemOutputType",
        p.runtime AS "problemRuntime",
        p.build_command AS "buildCommand",
        p.entrypoint AS "entrypoint"
      FROM assignments_with_status a 
      JOIN problems p
        ON a.problem_id = p.problem_id
      WHERE a.assignment_id = $1
    `;

    const resA = await pool.query(assignmentQuery, [assignmentId]);
    if (resA.rowCount === 0) {
      logger.warn({ fn, assignmentId }, `Assignment ${assignmentId} not found`);
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
        AND (alp.problem_id = $2 OR alp.problem_id IS NULL)
      ORDER BY l.language_id
    `;
    const resL = await pool.query(languageQuery, [assignmentId, row.problem_id]);
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
        tc.test_case_id                            AS "testCaseId",
        COALESCE(gto.input, sl.setup_sql, tc.input, '') AS "input",
        COALESCE(gto.expected_output, tc.expected_output, '') AS "expectedOutput",
        tc.is_public                                AS "isPublic",
        tc.stdin                                    AS "stdin",
        tc.env                                      AS "env",
        tc.compare                                  AS "compare"
      FROM problem_test_cases tc
      LEFT JOIN group_test_case_overrides gto
        ON gto.test_case_id = tc.test_case_id AND gto.group_id = $2
      LEFT JOIN schema_libraries sl
        ON sl.schema_library_id = tc.schema_library_id
      WHERE tc.problem_id = $1
      ORDER BY tc.test_case_id
    `;
    const resT = await pool.query(testCaseQuery, [row.problem_id, row.group_id]);
    const testCases: TestCase[] = resT.rows.map(r => ({
      testCaseId: r.testCaseId,
      input: r.input ?? undefined,
      expectedOutput: r.expectedOutput,
      isPublic: r.isPublic,
      stdin: r.stdin ?? undefined,
      env: r.env ?? undefined,
      compare: r.compare ?? undefined,
    }));

    // Systems problems: the editable + provided files the student sees. 'hidden'
    // files (harness, headers used only at build time) are deliberately excluded.
    const filesRes = await pool.query(
      `SELECT path, content, role FROM problem_files
         WHERE problem_id = $1 AND role IN ('template','readonly')
         ORDER BY role, path`,
      [row.problem_id]
    );
    const files = filesRes.rows.map(f => ({ path: f.path, content: f.content, role: f.role }));

    // The full ordered problem set. Each problem carries its own test cases,
    // files, starter code and per-assignment points. problems[0] is the primary
    // problem (same one exposed as `assignment.problem`).
    const apRes = await pool.query(
      `SELECT
         ap.problem_id, ap.points, ap.position,
         p.title, p.description, p.category,
         COALESCE(p.prerequisites, '')    AS prerequisites,
         COALESCE(p.learning_outcomes,'') AS learning_outcomes,
         COALESCE(p.tags, '')             AS tags,
         p.created_at,
         p.output_type   AS "outputType",
         p.runtime,
         p.build_command AS "buildCommand",
         p.entrypoint
       FROM assignment_problems ap
       JOIN problems p ON p.problem_id = ap.problem_id
      WHERE ap.assignment_id = $1
      ORDER BY ap.position, ap.problem_id`,
      [assignmentId]
    );
    const problems: AssignmentProblem[] = [];
    for (const pr of apRes.rows) {
      problems.push({
        points: pr.points,
        position: pr.position,
        languages: await loadProblemLanguages(assignmentId, pr.problem_id),
        problem: {
          problemId: pr.problem_id,
          title: pr.title,
          description: pr.description,
          category: pr.category ?? undefined,
          prerequisites: pr.prerequisites ?? undefined,
          learning_outcomes: pr.learning_outcomes ?? undefined,
          tags: pr.tags ?? undefined,
          created_at: new Date(pr.created_at),
          testCases: await loadProblemTestCases(pr.problem_id, row.group_id),
          outputType: pr.outputType ?? 'text',
          runtime: pr.runtime ?? 'standard',
          buildCommand: pr.buildCommand ?? undefined,
          entrypoint: pr.entrypoint ?? undefined,
          files: await loadProblemFiles(pr.problem_id),
        },
      });
    }

    const assignment: Assignment = {
      assignmentId: row.assignment_id,
      classroomId: row.classroom_id,
      title: row.assignment_title,
      description: row.assignment_description,
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
      problems,
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
        outputType: row.problemOutputType ?? 'text',
        runtime: row.problemRuntime ?? 'standard',
        buildCommand: row.buildCommand ?? undefined,
        entrypoint: row.entrypoint ?? undefined,
        files,
      }
    };

    logger.info({ fn, assignmentId }, `Fetched assignment ${assignmentId} successfully`);
    return assignment;
  } catch (err) {
    logger.error({ fn, assignmentId, err }, 'Error fetching assignment by id');
    throw err;
  }
};

export const ASSIGNMENT_NOT_ACCESSIBLE = "Assignment not found";

/**
 * The exact projection a student is allowed to see: private test cases removed
 * from every problem, and instructor-only fields stripped. Mutates and returns
 * the assignment. Shared by the student fetch and the instructor "preview as
 * student" fetch so both are guaranteed identical.
 */
export const toStudentProjection = (a: Assignment): Assignment => {
  a.problem.testCases = a.problem.testCases.filter((tc) => tc.isPublic);
  if (a.problems) {
    for (const ap of a.problems) {
      ap.problem.testCases = ap.problem.testCases.filter((tc) => tc.isPublic);
    }
  }
  delete (a as any).grading_method;
  delete (a as any).assigned_at;
  delete (a as any).plagiarism_detection;
  return a;
};

export const getAssignmentForStudent = async (
  assignmentId: number,
  studentId: number
): Promise<Assignment> => {
  const fn = "getAssignmentForStudent";
  try {
    logger.info({ fn, assignmentId, studentId }, `Loading assignment ${assignmentId} for student view`);

    // Enforced here rather than only in the controller so a future caller
    // cannot reach an assignment belonging to another group or classroom.
    if (!(await canStudentAccessAssignment(assignmentId, studentId))) {
      logger.warn({ fn, assignmentId, studentId }, `Student ${studentId} denied access to assignment ${assignmentId}`);
      throw new Error(ASSIGNMENT_NOT_ACCESSIBLE);
    }

    const a = toStudentProjection(await getAssignmentById(assignmentId));
    logger.info({ fn, assignmentId }, `Returning assignment ${assignmentId} to student`);
    return a;
  } catch (err) {
    logger.error({ fn, assignmentId, err }, 'Error in getAssignmentForStudent');
    throw err;
  }
};

/**
 * The same student projection, but authorized by the instructor OWNING the
 * assignment's classroom instead of by enrollment -- for "preview as student".
 */
export const getAssignmentPreviewForInstructor = async (
  assignmentId: number,
  instructorId: number
): Promise<Assignment> => {
  const fn = "getAssignmentPreviewForInstructor";
  const ownerId = await getAssignmentOwnerInstructorId(assignmentId);
  if (ownerId === null || ownerId !== instructorId) {
    logger.warn({ fn, assignmentId, instructorId, ownerId }, `Instructor ${instructorId} may not preview assignment ${assignmentId}`);
    throw new Error(ASSIGNMENT_NOT_ACCESSIBLE);
  }
  return toStudentProjection(await getAssignmentById(assignmentId));
};

export const deleteAssignment = async (assignmentId: number): Promise<void> => {
  const functionName = "deleteAssignment";
  try {
    logger.info({ fn: functionName, assignmentId }, `Deleting assignment with ID: ${assignmentId}.`);
    const deleteQuery = `
      DELETE FROM assignments
      WHERE assignment_id = $1
    `;
    await pool.query(deleteQuery, [assignmentId]);
    logger.info({ fn: functionName, assignmentId }, 'Assignment deleted successfully.');
  } catch (error) {
    logger.error({ fn: functionName, assignmentId, error }, 'Error deleting assignment');
    throw error;
  }
};

export const getAssignmentReleaseInfo = async (
  assignmentId: number
): Promise<{
  grading_method: string;
  grade_release_mode: string;
  due_date: Date | null;
  grades_released_at: Date | null;
} | null> => {
  const fn = "getAssignmentReleaseInfo";
  try {
    const { rows } = await pool.query(
      `SELECT grading_method, grade_release_mode, due_date, grades_released_at
       FROM assignments WHERE assignment_id = $1`,
      [assignmentId]
    );
    return rows[0] ?? null;
  } catch (error) {
    logger.error({ fn, assignmentId, error }, `Error fetching assignment release info: ${error}`);
    throw error;
  }
};

export const getAssignmentOwnerInstructorId = async (
  assignmentId: number
): Promise<number | null> => {
  const fn = "getAssignmentOwnerInstructorId";
  try {
    const { rows } = await pool.query(
      `SELECT c.instructor_id
       FROM assignments a
       JOIN classrooms c ON a.classroom_id = c.classroom_id
       WHERE a.assignment_id = $1`,
      [assignmentId]
    );
    return rows[0]?.instructor_id ?? null;
  } catch (error) {
    logger.error({ fn, assignmentId, error }, `Error fetching assignment owner: ${error}`);
    throw error;
  }
};

export const releaseGrades = async (
  assignmentId: number
): Promise<{ assignmentId: number; grades_released_at: Date } | null> => {
  const fn = "releaseGrades";
  try {
    const { rows } = await pool.query(
      `UPDATE assignments
       SET grades_released_at = NOW()
       WHERE assignment_id = $1 AND grade_release_mode = 'manual'
       RETURNING assignment_id, grades_released_at`,
      [assignmentId]
    );
    if (rows.length === 0) return null;
    logger.info({ fn, assignmentId }, `Released grades for assignment ${assignmentId}`);
    return { assignmentId: rows[0].assignment_id, grades_released_at: rows[0].grades_released_at };
  } catch (error) {
    logger.error({ fn, assignmentId, error }, `Error releasing grades: ${error}`);
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
               'input', COALESCE(psl.setup_sql, ptc.input),
               'expectedOutput', ptc.expected_output,
               'isPublic', ptc.is_public
             )
           ), '[]'::json)
           FROM problem_test_cases ptc
           LEFT JOIN schema_libraries psl
             ON psl.schema_library_id = ptc.schema_library_id
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
  const fn = "getAssignmentsForStudentClassroom";
  try {
    logger.info({ fn, classroomId, studentId }, `Fetching assignments for student ${studentId} in classroom ${classroomId}`);

    const query = `
      SELECT 
        a.assignment_id           AS "assignmentId",
        a.classroom_id            AS "classroomId",
        a.problem_id              AS "problemId",
        a.title,
        a.description,
        a.difficulty_level        AS "difficultyLevel",
        a.points,
        a.grading_method          AS "gradingMethod",
        a.max_submissions         AS "submissionAttempts",
        a.plagiarism_detection    AS "plagiarismDetection",
        to_char(a.assigned_at,    'YYYY-MM-DD"T"HH24:MI:SSZ') AS "assignedAt",
        to_char(a.publish_date,   'YYYY-MM-DD"T"HH24:MI:SSZ') AS "publishDate",
        to_char(a.due_date,       'YYYY-MM-DD"T"HH24:MI:SSZ') AS "dueDate",
        a.status                  AS "status",
        a.grade_release_mode      AS "gradeReleaseMode",
        a.grades_released_at      AS "gradesReleasedAt",

        EXISTS (
          SELECT 1 
            FROM submission_attempts sa
           WHERE sa.assignment_id = a.assignment_id
             AND sa.student_id    = $2
        )                          AS "submitted",

        (
          SELECT s.final_score
            FROM submissions s
           WHERE s.assignment_id = a.assignment_id
             AND s.student_id    = $2
           ORDER BY s.submitted_at DESC
           LIMIT 1
        )                          AS "finalScore",

        json_build_object(
          'problemId',     p.problem_id,
          'instructorId',  p.instructor_id,
          'title',         p.title,
          'description',   p.description,
          'category',      p.category,
          'prerequisites', p.prerequisites,
          'learning_outcomes', p.learning_outcomes,
          'tags',          p.tags,
          'created_at',    p.created_at,
          'testCases', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'testCaseId',     ptc.test_case_id,
                'input',          ptc.input,
                'expectedOutput', ptc.expected_output,
                'isPublic',       ptc.is_public
              )
            ), '[]'::json)
            FROM problem_test_cases ptc
           WHERE ptc.problem_id = p.problem_id
          )
        )                          AS problem,

        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'pairId',      alp.pair_id,
              'assignmentId',alp.assignment_id,
              'languageId',  alp.language_id,
              'initial_code',alp.initial_code,
              'name',        l.name,
              'version',     l.version
            )
          ), '[]'::json)
          FROM assignment_languages_pairs alp
          JOIN languages l ON l.language_id = alp.language_id
         WHERE alp.assignment_id = a.assignment_id
        )                          AS languages

      FROM assignments_with_status a
      JOIN problems p ON p.problem_id = a.problem_id
     WHERE a.classroom_id = $1
       AND ${studentVisibleAssignmentSql("$2")};
    `;

    logger.debug({ fn, classroomId, studentId }, `Executing assignments query for classroom ${classroomId}`);
    const result = await pool.query(query, [classroomId, studentId]);
    logger.info(
      { fn, classroomId, studentId, count: result.rowCount },
      `Found ${result.rowCount} assignments for student ${studentId}`
    );

    return result.rows.map((row: any) => {
      const visible = isGradeVisible({
        grading_method: row.gradingMethod,
        grade_release_mode: row.gradeReleaseMode,
        due_date: row.dueDate,
        grades_released_at: row.gradesReleasedAt,
      });
      return {
        ...row,
        finalScore: visible ? row.finalScore : null,
      };
    }) as Assignment[];
  } catch (error) {
    console.error("Error fetching assignments:", error);
    throw error;
  }
}


export const getAssignments = async (instructorId: number): Promise<Assignment[]> => {
  const functionName = 'getAssignments';
  try {
    logger.info({ fn: functionName, instructorId }, `Fetching assignments for instructor ID: ${instructorId}`);
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
    logger.error({ fn: functionName, instructorId, error }, 'Error fetching assignments for instructor');
    throw error;
  }
};

export async function getAssignmentRuntime(
  assignmentId: number,
  problemId?: number
): Promise<{ problemId: number; runtime: string } | null> {
  const { rows } = await pool.query(
    `SELECT p.problem_id AS "problemId", p.runtime
       FROM assignments a JOIN problems p ON p.problem_id = COALESCE($2, a.problem_id)
      WHERE a.assignment_id = $1`,
    [assignmentId, problemId ?? null]
  );
  return rows[0] ?? null;
}

/**
 * Resolve the problem a student is acting on within an assignment, and verify
 * it is actually part of that assignment. Returns the assignment's primary
 * problem when none is given (single-problem assignments / older clients).
 * Throws when a problemId is supplied that is not in the assignment -- which is
 * what stops a student submitting against an arbitrary problem id.
 */
export async function resolveAssignmentProblemId(
  assignmentId: number,
  problemId?: number | null
): Promise<number> {
  if (problemId == null) {
    const { rows } = await pool.query(
      `SELECT problem_id FROM assignments WHERE assignment_id = $1`,
      [assignmentId]
    );
    if (!rows[0]) throw new Error("Assignment not found");
    return rows[0].problem_id as number;
  }
  const { rowCount } = await pool.query(
    `SELECT 1 FROM assignment_problems WHERE assignment_id = $1 AND problem_id = $2`,
    [assignmentId, problemId]
  );
  if (!rowCount) throw new Error("Problem is not part of this assignment");
  return problemId;
}

export async function getRemainingAttempts(
  assignmentId: number,
  studentId: number,
  problemId?: number
): Promise<number> {
  const functionName = "getRemainingAttempts";
  logger.info(
    { fn: functionName, assignmentId, studentId },
    `Checking remaining attempts for assignment ${assignmentId} and student ${studentId}`
  );

  try {
    logger.debug({ fn: functionName, assignmentId }, `Getting max submission attempts for assignment ${assignmentId}`);
    const assignRes = await pool.query<{ max_submissions: number | null }>(
      `
      SELECT max_submissions
      FROM assignments
      WHERE assignment_id = $1
      `,
      [assignmentId]
    );

    if (assignRes.rowCount === 0) {
      logger.warn({ fn: functionName, assignmentId }, `Assignment ${assignmentId} not found`);
      throw new Error("Assignment not found");
    }

    const maxAttempts = assignRes.rows[0].max_submissions;
    logger.info(
      { fn: functionName, assignmentId, maxAttempts },
      `Max attempts for assignment ${assignmentId}: ${maxAttempts === null ? 'Unlimited' : maxAttempts}`
    );

    if (maxAttempts === null) {
      logger.debug(
        { fn: functionName, assignmentId, studentId },
        `Returning unlimited attempts (Infinity) for assignment ${assignmentId}`
      );
      return Infinity;
    }

    
    logger.debug(
      { fn: functionName, assignmentId, studentId },
      `Counting submission attempts in submission_attempts for assignment ${assignmentId} and student ${studentId}`
    );
    const countRes = await pool.query<{ cnt: string }>(
      `
      SELECT COUNT(*) AS cnt
      FROM submission_attempts
      WHERE assignment_id = $1
        AND student_id = $2
        AND ($3::int IS NULL OR problem_id = $3)
      `,
      [assignmentId, studentId, problemId ?? null]
    );

    const used = parseInt(countRes.rows[0].cnt, 10);
    logger.info(
      { fn: functionName, assignmentId, studentId, used },
      `Used attempts for assignment ${assignmentId} by student ${studentId}: ${used}`
    );

    const remaining = Math.max(0, maxAttempts - used);
    logger.info(
      { fn: functionName, assignmentId, studentId, remaining },
      `Remaining attempts calculated: ${remaining}`
    );

    return remaining;
  } catch (error) {
    logger.error(
      { fn: functionName, assignmentId, studentId, error },
      `Error in ${functionName} for assignment ${assignmentId}, student ${studentId}`
    );
    throw error;
  }
}


export async function getSubmissionAttemptCount(
  assignmentId: number,
  studentId: number,
  problemId?: number
): Promise<number> {
  const functionName = "getSubmissionAttemptCount";
  logger.info(
    { fn: functionName, assignmentId, studentId, problemId },
    `Getting submission attempt count for assignment ${assignmentId} and student ${studentId}`
  );

  try {
    const result = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt
       FROM submission_attempts
       WHERE assignment_id = $1
       AND student_id = $2
       AND ($3::int IS NULL OR problem_id = $3)`,
      [assignmentId, studentId, problemId ?? null]
    );
    
    const count = parseInt(result.rows[0].cnt, 10);
    logger.info(
      { fn: functionName, assignmentId, studentId, count },
      `Found ${count} submission attempts`
    );
    
    return count;
  } catch (error) {
    logger.error(
      { fn: functionName, assignmentId, studentId, error },
      `Error in ${functionName} for assignment ${assignmentId}, student ${studentId}`
    );
    throw error;
  }
}

export const getUpcomingDeadlines = async (
  studentId: number,
  hours: number = 24
): Promise<any[]> => {
  const fn = "getUpcomingDeadlines";
  try {
    logger.info(
      { fn, studentId, hours },
      `Getting assignments with deadlines within ${hours}h for student ${studentId}`
    )

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
        c.classroom_name AS course
      FROM assignments a
      JOIN classrooms c
        ON a.classroom_id = c.classroom_id
      JOIN classroom_enrollments ce
        ON c.classroom_id = ce.classroom_id
      WHERE
        ce.student_id = $1
        AND ${studentVisibleAssignmentSql("$1")}
        AND a.due_date > $2
        AND a.due_date <= $3
        AND NOT EXISTS (
          SELECT 1
          FROM submission_attempts sa
          WHERE
            sa.student_id = $1
            AND sa.assignment_id = a.assignment_id
        )
      ORDER BY a.due_date ASC
    `;

    const result = await pool.query(query, [
      studentId,
      now,
      threshold,
    ]);

    const upcoming = result.rows.map((row) => ({
      id:         row.assignment_id,
      title:      row.title,
      course:     row.course,
      dueDate:    row.due_date,
      status:     "Not Started",
      points:     row.points,
      difficulty: row.difficulty_level,
    }));

    logger.info(
      { fn, studentId, hours, count: upcoming.length },
      `Found ${upcoming.length} upcoming assignments`
    );
    return upcoming;
  } catch (err: any) {
    logger.error({ fn, studentId, hours, err }, 'Error getting upcoming deadlines');
    throw err;
  }
};