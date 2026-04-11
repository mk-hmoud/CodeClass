import pool from "../config/db";
import logger from "../config/logger";

/** Deterministic shuffle using session_id as seed (Fisher-Yates with LCG). */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const startSession = async (quizId: number, studentId: number) => {
  const fn = "startSession";
  logger.info({ fn, quizId, studentId }, "Starting or resuming quiz session");

  // Check quiz is published and within window
  const quizResult = await pool.query(
    `SELECT quiz_id, is_published, start_date, end_date, time_limit_minutes, shuffle_problems
     FROM quizzes WHERE quiz_id = $1`,
    [quizId]
  );
  if (quizResult.rowCount === 0) throw new Error("Quiz not found.");
  const quiz = quizResult.rows[0];
  if (!quiz.is_published) throw new Error("Quiz is not published.");

  const now = new Date();
  if (quiz.start_date && now < new Date(quiz.start_date))
    throw new Error("Quiz has not started yet.");
  if (quiz.end_date && now > new Date(quiz.end_date))
    throw new Error("Quiz has ended.");

  // Return existing session if one exists
  const existing = await pool.query(
    `SELECT session_id, status, start_time, end_time, final_score
     FROM quiz_sessions WHERE quiz_id = $1 AND student_id = $2`,
    [quizId, studentId]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    const session = existing.rows[0];
    logger.info({ fn, sessionId: session.session_id }, "Resuming existing session");
    const problems = await getSessionProblems(quizId, session.session_id, quiz.shuffle_problems);
    return { ...session, timeLimitMinutes: quiz.time_limit_minutes, problems };
  }

  // Create new session
  const insertResult = await pool.query(
    `INSERT INTO quiz_sessions (quiz_id, student_id, start_time, status)
     VALUES ($1, $2, NOW(), 'in_progress')
     RETURNING session_id, status, start_time, end_time, final_score`,
    [quizId, studentId]
  );
  const session = insertResult.rows[0];
  logger.info({ fn, sessionId: session.session_id }, "New session created");

  const problems = await getSessionProblems(quizId, session.session_id, quiz.shuffle_problems);
  return { ...session, timeLimitMinutes: quiz.time_limit_minutes, problems };
};

async function getSessionProblems(quizId: number, sessionId: number, shuffle: boolean) {
  const result = await pool.query(
    `SELECT
       qp.quiz_problem_id AS "quizProblemId",
       qp.problem_id      AS "problemId",
       qp.points,
       qp.problem_order   AS "problemOrder",
       p.title,
       p.description,
       p.category,
       (SELECT COUNT(*) FROM problem_test_cases tc WHERE tc.problem_id = qp.problem_id AND tc.is_public = true)::int AS "publicTestCount"
     FROM quiz_problems qp
     JOIN problems p ON p.problem_id = qp.problem_id
     WHERE qp.quiz_id = $1
     ORDER BY qp.problem_order`,
    [quizId]
  );
  const problems = result.rows;
  return shuffle ? seededShuffle(problems, sessionId) : problems;
}

export const getSession = async (sessionId: number, studentId: number) => {
  const fn = "getSession";
  logger.debug({ fn, sessionId, studentId }, "Fetching session");

  const sessionResult = await pool.query(
    `SELECT
       qs.session_id, qs.quiz_id, qs.status, qs.start_time, qs.end_time, qs.final_score,
       q.time_limit_minutes, q.shuffle_problems, q.title AS "quizTitle"
     FROM quiz_sessions qs
     JOIN quizzes q ON q.quiz_id = qs.quiz_id
     WHERE qs.session_id = $1 AND qs.student_id = $2`,
    [sessionId, studentId]
  );
  if (sessionResult.rowCount === 0) throw new Error("Session not found.");
  const session = sessionResult.rows[0];

  const problems = await getSessionProblems(session.quiz_id, sessionId, session.shuffle_problems);

  // Attach latest submission status per problem
  const subsResult = await pool.query(
    `SELECT DISTINCT ON (qp.quiz_problem_id)
       qp.quiz_problem_id AS "quizProblemId",
       sub.submission_id  AS "submissionId",
       sub.status,
       sub.passed_tests   AS "passedTests",
       sub.total_tests    AS "totalTests",
       sub.auto_score     AS "autoScore",
       sub.submitted_at   AS "submittedAt"
     FROM quiz_problems qp
     LEFT JOIN quiz_submissions sub
       ON sub.quiz_problem_id = qp.quiz_problem_id AND sub.session_id = $1
     WHERE qp.quiz_id = $2
     ORDER BY qp.quiz_problem_id, sub.submitted_at DESC`,
    [sessionId, session.quiz_id]
  );

  const submissionMap = new Map(subsResult.rows.map((r: any) => [r.quizProblemId, r]));
  const problemsWithStatus = problems.map((p: any) => ({
    ...p,
    submission: submissionMap.get(p.quizProblemId) ?? null,
  }));

  return { ...session, problems: problemsWithStatus };
};

export const submitSession = async (sessionId: number, studentId: number) => {
  const fn = "submitSession";
  logger.info({ fn, sessionId, studentId }, "Submitting session");

  const check = await pool.query(
    "SELECT status FROM quiz_sessions WHERE session_id = $1 AND student_id = $2",
    [sessionId, studentId]
  );
  if (check.rowCount === 0) throw new Error("Session not found.");
  if (check.rows[0].status === "submitted" || check.rows[0].status === "graded")
    throw new Error("Session already submitted.");

  await pool.query(
    `UPDATE quiz_sessions SET status = 'submitted', end_time = NOW()
     WHERE session_id = $1`,
    [sessionId]
  );
  logger.info({ fn, sessionId }, "Session marked as submitted");
};
