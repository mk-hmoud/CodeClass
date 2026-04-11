import pool from "../config/db";
import { QuizCreationData, QuizUpdateData } from "../types";
import logger from "../config/logger";

export const createQuiz = async (
  quizData: QuizCreationData,
  instructorId: number
): Promise<{ quizId: number }> => {
  const fn = "createQuiz";
  const client = await pool.connect();
  try {
    logger.info({ fn, instructorId }, "Beginning transaction");
    await client.query("BEGIN");

    const insertQuizSql = `
      INSERT INTO quizzes (
        classroom_id,
        instructor_id,
        title,
        description,
        time_limit_minutes,
        start_date,
        end_date,
        shuffle_problems,
        is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING quiz_id;
    `;
    const quizResult = await client.query(insertQuizSql, [
      quizData.classroomId,
      instructorId,
      quizData.title,
      quizData.description,
      quizData.time_limit_minutes,
      quizData.startDate,
      quizData.endDate,
      quizData.shuffleProblems,
      false,
    ]);

    const quizId = quizResult.rows[0].quiz_id;
    logger.info({ fn, quizId }, "Quiz row inserted");

    if (!quizData.problems || quizData.problems.length === 0) {
      throw new Error("Cannot create a quiz with no problems.");
    }

    const insertProblemSql = `
      INSERT INTO quiz_problems (quiz_id, problem_id, points, problem_order)
      VALUES ($1, $2, $3, $4);
    `;
    for (const problem of quizData.problems) {
      await client.query(insertProblemSql, [
        quizId,
        problem.problemId,
        problem.points,
        problem.problemOrder,
      ]);
    }
    logger.info({ fn, quizId, count: quizData.problems.length }, "Problems inserted");

    await client.query("COMMIT");
    logger.info({ fn, quizId }, "Transaction committed");
    return { quizId };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ fn, err }, "Transaction rolled back");
    throw err;
  } finally {
    client.release();
  }
};

export const getQuizzesByClassroom = async (classroomId: number) => {
  const fn = "getQuizzesByClassroom";
  logger.debug({ fn, classroomId }, "Fetching quizzes for classroom");

  const sql = `
    SELECT
      q.quiz_id        AS "quizId",
      q.title,
      q.description,
      q.time_limit_minutes,
      q.start_date     AS "startDate",
      q.end_date       AS "endDate",
      q.shuffle_problems AS "shuffleProblems",
      q.is_published   AS "isPublished",
      q.created_at     AS "createdAt",
      COUNT(qp.quiz_problem_id)::int AS "problemCount"
    FROM quizzes q
    LEFT JOIN quiz_problems qp ON qp.quiz_id = q.quiz_id
    WHERE q.classroom_id = $1
    GROUP BY q.quiz_id
    ORDER BY q.created_at DESC;
  `;
  const result = await pool.query(sql, [classroomId]);
  logger.debug({ fn, classroomId, count: result.rowCount }, "Quizzes fetched");
  return result.rows;
};

export const getQuizById = async (quizId: number) => {
  const fn = "getQuizById";
  logger.debug({ fn, quizId }, "Fetching quiz");

  const quizSql = `
    SELECT
      q.quiz_id        AS "quizId",
      q.classroom_id   AS "classroomId",
      q.instructor_id  AS "instructorId",
      q.title,
      q.description,
      q.time_limit_minutes,
      q.start_date     AS "startDate",
      q.end_date       AS "endDate",
      q.shuffle_problems AS "shuffleProblems",
      q.is_published   AS "isPublished",
      q.created_at     AS "createdAt"
    FROM quizzes q
    WHERE q.quiz_id = $1;
  `;
  const quizResult = await pool.query(quizSql, [quizId]);
  if (quizResult.rowCount === 0) {
    throw new Error("Quiz not found.");
  }
  const quiz = quizResult.rows[0];

  const problemsSql = `
    SELECT
      qp.quiz_problem_id AS "quizProblemId",
      qp.problem_id      AS "problemId",
      qp.points,
      qp.problem_order   AS "problemOrder",
      p.title            AS "problemTitle",
      p.description      AS "problemDescription",
      p.category
    FROM quiz_problems qp
    JOIN problems p ON p.problem_id = qp.problem_id
    WHERE qp.quiz_id = $1
    ORDER BY qp.problem_order;
  `;
  const problemsResult = await pool.query(problemsSql, [quizId]);
  quiz.problems = problemsResult.rows;

  logger.debug({ fn, quizId, problemCount: problemsResult.rowCount }, "Quiz fetched");
  return quiz;
};

export const updateQuiz = async (
  quizId: number,
  instructorId: number,
  data: QuizUpdateData
): Promise<void> => {
  const fn = "updateQuiz";
  const client = await pool.connect();
  try {
    logger.info({ fn, quizId, instructorId }, "Beginning update transaction");
    await client.query("BEGIN");

    const checkResult = await client.query(
      "SELECT instructor_id FROM quizzes WHERE quiz_id = $1",
      [quizId]
    );
    if (checkResult.rowCount === 0) throw new Error("Quiz not found.");
    if (checkResult.rows[0].instructor_id !== instructorId)
      throw new Error("Forbidden: You are not the owner of this quiz.");

    await client.query(
      `UPDATE quizzes SET
        title               = $1,
        description         = $2,
        time_limit_minutes  = $3,
        start_date          = $4,
        end_date            = $5,
        shuffle_problems    = $6
       WHERE quiz_id = $7`,
      [
        data.title,
        data.description,
        data.time_limit_minutes,
        data.startDate,
        data.endDate,
        data.shuffleProblems,
        quizId,
      ]
    );

    if (data.problems) {
      await client.query("DELETE FROM quiz_problems WHERE quiz_id = $1", [quizId]);
      const insertSql = `
        INSERT INTO quiz_problems (quiz_id, problem_id, points, problem_order)
        VALUES ($1, $2, $3, $4);
      `;
      for (const p of data.problems) {
        await client.query(insertSql, [quizId, p.problemId, p.points, p.problemOrder]);
      }
      logger.info({ fn, quizId, count: data.problems.length }, "Problems replaced");
    }

    await client.query("COMMIT");
    logger.info({ fn, quizId }, "Update committed");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ fn, quizId, err }, "Update rolled back");
    throw err;
  } finally {
    client.release();
  }
};

export const togglePublish = async (
  quizId: number,
  instructorId: number
): Promise<{ isPublished: boolean }> => {
  const fn = "togglePublish";
  logger.info({ fn, quizId, instructorId }, "Toggling publish status");

  const check = await pool.query(
    "SELECT instructor_id, is_published FROM quizzes WHERE quiz_id = $1",
    [quizId]
  );
  if (check.rowCount === 0) throw new Error("Quiz not found.");
  if (check.rows[0].instructor_id !== instructorId)
    throw new Error("Forbidden: You are not the owner of this quiz.");

  const newStatus = !check.rows[0].is_published;
  await pool.query("UPDATE quizzes SET is_published = $1 WHERE quiz_id = $2", [
    newStatus,
    quizId,
  ]);
  logger.info({ fn, quizId, isPublished: newStatus }, "Publish status updated");
  return { isPublished: newStatus };
};

export const deleteQuiz = async (
  quizId: number,
  instructorId: number
): Promise<{ success: boolean }> => {
  const fn = "deleteQuiz";
  logger.info({ fn, quizId, instructorId }, "Attempting to delete quiz");

  const result = await pool.query(
    "DELETE FROM quizzes WHERE quiz_id = $1 AND instructor_id = $2",
    [quizId, instructorId]
  );

  if (result.rowCount === 0) {
    const check = await pool.query(
      "SELECT instructor_id FROM quizzes WHERE quiz_id = $1",
      [quizId]
    );
    if (check.rowCount && check.rowCount > 0) {
      throw new Error("Forbidden: You are not the owner of this quiz.");
    } else {
      throw new Error("Quiz not found.");
    }
  }

  logger.info({ fn, quizId }, "Quiz deleted");
  return { success: true };
};
