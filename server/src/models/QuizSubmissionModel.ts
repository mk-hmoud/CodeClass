import pool from "../config/db";
import logger from "../config/logger";
import { TestCase, TestResult } from "../types";

export const getQuizProblemTestCases = async (quizProblemId: number): Promise<TestCase[]> => {
  const fn = "getQuizProblemTestCases";
  const sql = `
    SELECT tc.test_case_id    AS "testCaseId",
           tc.input,
           tc.expected_output  AS "expectedOutput",
           tc.is_public        AS "isPublic"
    FROM quiz_problems qp
    JOIN problem_test_cases tc ON tc.problem_id = qp.problem_id
    WHERE qp.quiz_problem_id = $1
    ORDER BY tc.test_case_id
  `;
  const { rows } = await pool.query(sql, [quizProblemId]);
  logger.debug({ fn, quizProblemId, count: rows.length }, "Test cases fetched");
  return rows;
};

export const createQuizSubmission = async (
  sessionId: number,
  quizProblemId: number,
  languageId: number,
  code: string
): Promise<number> => {
  const fn = "createQuizSubmission";
  logger.info({ fn, sessionId, quizProblemId }, "Creating quiz submission");

  const { rows } = await pool.query(
    `INSERT INTO quiz_submissions (session_id, quiz_problem_id, language_id, code, status)
     VALUES ($1, $2, $3, $4, 'queued')
     RETURNING submission_id`,
    [sessionId, quizProblemId, languageId, code]
  );
  const submissionId = rows[0].submission_id;
  logger.info({ fn, submissionId }, "Quiz submission created");
  return submissionId;
};

export const saveQuizSubmissionResults = async (
  submissionId: number,
  testResults: TestResult[],
  pointsForProblem: number
): Promise<void> => {
  const fn = "saveQuizSubmissionResults";
  logger.info({ fn, submissionId, testResultCount: testResults.length }, "Saving quiz submission results");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert per-test results
    for (const r of testResults) {
      await client.query(
        `INSERT INTO quiz_submission_results
           (submission_id, test_case_id, passed, actual_output, execution_time_ms, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (submission_id, test_case_id) DO UPDATE
           SET passed = EXCLUDED.passed,
               actual_output = EXCLUDED.actual_output,
               execution_time_ms = EXCLUDED.execution_time_ms,
               error_message = EXCLUDED.error_message`,
        [
          submissionId,
          r.testCaseId ?? null,
          r.status === "passed",
          r.actual ?? null,
          r.executionTime ?? null,
          r.errorMessage ?? null,
        ]
      );
    }

    const passed = testResults.filter((r) => r.status === "passed").length;
    const total = testResults.length;
    const autoScore = total > 0 ? (passed / total) * pointsForProblem : 0;

    await client.query(
      `UPDATE quiz_submissions
       SET status = 'completed', passed_tests = $1, total_tests = $2, auto_score = $3
       WHERE submission_id = $4`,
      [passed, total, Math.round(autoScore * 100) / 100, submissionId]
    );

    logger.info({ fn, submissionId, passed, total, autoScore }, "Quiz submission updated");

    // Recalculate session final_score: sum the best (latest) auto_score per problem
    await client.query(
      `UPDATE quiz_sessions
       SET final_score = (
         SELECT COALESCE(SUM(latest.auto_score), 0)
         FROM (
           SELECT DISTINCT ON (sub.quiz_problem_id) sub.auto_score
           FROM quiz_submissions sub
           WHERE sub.session_id = quiz_sessions.session_id
             AND sub.status = 'completed'
           ORDER BY sub.quiz_problem_id, sub.submitted_at DESC
         ) latest
       )
       WHERE session_id = (
         SELECT session_id FROM quiz_submissions WHERE submission_id = $1
       )`,
      [submissionId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ fn, submissionId, err }, "Error saving quiz submission results");
    throw err;
  } finally {
    client.release();
  }
};

export const getQuizSubmission = async (submissionId: number) => {
  const { rows } = await pool.query(
    `SELECT qs.submission_id, qs.session_id, qs.quiz_problem_id, qs.status,
            qs.passed_tests, qs.total_tests, qs.auto_score,
            qp.points, qp.problem_id
     FROM quiz_submissions qs
     JOIN quiz_problems qp ON qp.quiz_problem_id = qs.quiz_problem_id
     WHERE qs.submission_id = $1`,
    [submissionId]
  );
  if (rows.length === 0) throw new Error("Submission not found.");
  return rows[0];
};

export const getSessionResults = async (sessionId: number) => {
  const fn = "getSessionResults";
  logger.debug({ fn, sessionId }, "Fetching session results");

  const sessionResult = await pool.query(
    `SELECT qs.session_id, qs.status, qs.start_time, qs.end_time, qs.final_score,
            q.title AS "quizTitle", q.time_limit_minutes
     FROM quiz_sessions qs
     JOIN quizzes q ON q.quiz_id = qs.quiz_id
     WHERE qs.session_id = $1`,
    [sessionId]
  );
  if (sessionResult.rowCount === 0) throw new Error("Session not found.");
  const session = sessionResult.rows[0];

  const problemResults = await pool.query(
    `SELECT DISTINCT ON (sub.quiz_problem_id)
       sub.quiz_problem_id AS "quizProblemId",
       p.title             AS "problemTitle",
       qp.points,
       sub.passed_tests    AS "passedTests",
       sub.total_tests     AS "totalTests",
       sub.auto_score      AS "autoScore",
       sub.submitted_at    AS "submittedAt"
     FROM quiz_problems qp
     JOIN problems p ON p.problem_id = qp.problem_id
     LEFT JOIN quiz_submissions sub
       ON sub.quiz_problem_id = qp.quiz_problem_id AND sub.session_id = $1
     WHERE qp.quiz_id = (
       SELECT quiz_id FROM quiz_sessions WHERE session_id = $1
     )
     ORDER BY sub.quiz_problem_id, sub.submitted_at DESC`,
    [sessionId]
  );

  return { ...session, problems: problemResults.rows };
};

export const getQuizResults = async (quizId: number) => {
  const fn = "getQuizResults";
  logger.debug({ fn, quizId }, "Fetching all quiz session results");

  const sessions = await pool.query(
    `SELECT
       qs.session_id    AS "sessionId",
       qs.student_id    AS "studentId",
       u.first_name     AS "firstName",
       u.last_name      AS "lastName",
       u.email,
       qs.status,
       qs.start_time    AS "startTime",
       qs.end_time      AS "endTime",
       qs.final_score   AS "finalScore"
     FROM quiz_sessions qs
     JOIN students st ON st.student_id = qs.student_id
     JOIN users u ON u.user_id = st.user_id
     WHERE qs.quiz_id = $1
     ORDER BY qs.start_time DESC`,
    [quizId]
  );

  return sessions.rows;
};
