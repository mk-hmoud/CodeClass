import pool from "../config/db";
import { QuizCreationData } from "../types";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [QuizModel.ts] [${functionName}] ${message}`);
};

export const createQuiz = async (
  quizData: QuizCreationData,
  instructorId: number
): Promise<{ quizId: number }> => {
  const fn = "createQuiz";
  const client = await pool.connect();
  try {
    logMessage(fn, `Beginning transaction for instructor ${instructorId}`);
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
      true,// need to change later possibly, not important currently to allow instructor
            // to create quizes which are not "published".
    ]);

    const quizId = quizResult.rows[0].quiz_id;
    logMessage(fn, `Inserted quiz with ID: ${quizId}`);

    if (quizData.problems && quizData.problems.length > 0) {
      const insertProblemSql = `
        INSERT INTO quiz_problems (
          quiz_id,
          problem_id,
          points,
          problem_order
        ) VALUES ($1, $2, $3, $4);
      `;
      for (const problem of quizData.problems) {
        await client.query(insertProblemSql, [
          quizId,
          problem.problemId,
          problem.points,
          problem.problemOrder,
        ]);
      }
      logMessage(fn, `Inserted ${quizData.problems.length} problems for quiz ${quizId}`);
    } else {
        throw new Error("Cannot create a quiz with no problems.");
    }

    await client.query("COMMIT");
    logMessage(fn, "Transaction committed successfully.");
    return { quizId };
  } catch (err) {
    await client.query("ROLLBACK");
    logMessage(fn, `Transaction rolled back due to error: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  } finally {
    client.release();
  }
};

export const deleteQuiz = async (quizId: number, instructorId: number): Promise<{ success: boolean }> => {
    const fn = "deleteQuiz";
    logMessage(fn, `Attempting to delete quiz ${quizId} by instructor ${instructorId}`);
    
    const result = await pool.query(
      'DELETE FROM quizzes WHERE quiz_id = $1 AND instructor_id = $2',
      [quizId, instructorId]
    );

    if (result.rowCount === 0) {
        logMessage(fn, `Deletion failed. Quiz ${quizId} not found or instructor ${instructorId} is not the owner.`);
        const check = await pool.query('SELECT instructor_id FROM quizzes WHERE quiz_id = $1', [quizId]);
        if (check.rowCount && check.rowCount > 0) {
            throw new Error("Forbidden: You are not the owner of this quiz.");
        } else {
            throw new Error("Quiz not found.");
        }
    }
    
    logMessage(fn, `Successfully deleted quiz ${quizId}`);
    return { success: true };
};
