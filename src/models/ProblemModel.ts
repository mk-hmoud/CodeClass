import pool from "../config/db";
import { Problem } from "../types";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [ProblemModel.ts] [${functionName}] ${message}`);
};

export interface ProblemCreationData {
  instructorId: number;
  title: string;
  description: string;
  category?: "Fundamentals" | "Algorithms" | "Bug fixes" | "Refactoring" | "Puzzles";
  prerequisites?: string;
  learning_outcomes?: string;
  tags?: string;
  test_cases: Array<{
    input?: string;
    expectedOutput: string;
    isPublic?: boolean;
  }>;
}

export const createProblem = async (
  data: ProblemCreationData
): Promise<{ problemId: number }> => {
  const functionName = "createProblem";
  try {
    logMessage(functionName, "Beginning transaction for problem creation.");
    await pool.query("BEGIN");

    const insertProblemQuery = `
      INSERT INTO problems (instructor_id, title, description, category, prerequisites, learning_outcomes, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING problem_id
    `;
    const result = await pool.query(insertProblemQuery, [
      data.instructorId,
      data.title,
      data.description,
      data.category || null,
      data.prerequisites || null,
      data.learning_outcomes || null,
      data.tags || null,
    ]);
    const problemId: number = result.rows[0].problem_id;
    logMessage(functionName, `Inserted problem with ID: ${problemId}`);

    if (data.test_cases && data.test_cases.length > 0) {
      const insertTestCaseQuery = `
        INSERT INTO problem_test_cases (problem_id, input, expected_output, is_public)
        VALUES ($1, $2, $3, $4)
      `;
      for (const tc of data.test_cases) {
        await pool.query(insertTestCaseQuery, [
          problemId,
          tc.input || null,
          tc.expectedOutput,
          tc.isPublic !== undefined ? tc.isPublic : false,
        ]);
      }
      logMessage(functionName, `Inserted ${data.test_cases.length} test case(s) for problem ID: ${problemId}`);
    }

    await pool.query("COMMIT");
    return { problemId };
  } catch (error) {
    await pool.query("ROLLBACK");
    logMessage(functionName, `Transaction rolled back due to error: ${error}`);
    throw error;
  }
};

export const getProblemById = async (problemId: number): Promise<Problem | null> => {
  const functionName = "getProblemById";
  try {
    const query = `SELECT * FROM problems WHERE problem_id = $1`;
    const result = await pool.query(query, [problemId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const problem: Problem = {
      problemId: row.problem_id,
      instructorId: row.instructor_id,
      title: row.title,
      description: row.description,
      category: row.category,
      prerequisites: row.prerequisites,
      learning_outcomes: row.learning_outcomes,
      tags: row.tags,
      created_at: row.created_at,
      test_cases: [] 
    };

    const test_casesQuery = `
      SELECT * FROM problem_test_cases
      WHERE problem_id = $1
      ORDER BY test_case_id ASC
    `;
    const test_casesResult = await pool.query(test_casesQuery, [problemId]);
    problem.test_cases = test_casesResult.rows.map((tc: any) => ({
      testCaseId: tc.test_case_id,
      input: tc.input,
      expectedOutput: tc.expected_output,
      isPublic: tc.is_public,
    }));

    logMessage(functionName, `Fetched problem with ID: ${problemId}`);
    return problem;
  } catch (error) {
    logMessage(functionName, `Error fetching problem: ${error}`);
    throw error;
  }
};

export const getProblemsByInstructor = async (instructorId: number): Promise<Problem[]> => {
  const functionName = "getProblemsByInstructor";
  try {
    const query = `
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'testCaseId', tc.test_case_id,
              'input', tc.input,
              'expectedOutput', tc.expected_output,
              'isPublic', tc.is_public
            )
          ) FILTER (WHERE tc.test_case_id IS NOT NULL),
          '[]'
        ) as testCases
      FROM problems p
      LEFT JOIN problem_test_cases tc ON p.problem_id = tc.problem_id
      WHERE p.instructor_id = $1
      GROUP BY p.problem_id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [instructorId]);
    logMessage(functionName, `Fetched ${result.rows.length} problems for instructor ID: ${instructorId}`);
    return result.rows.map((row: any) => ({
      problemId: row.problem_id,
      instructorId: row.instructor_id,
      title: row.title,
      description: row.description,
      category: row.category,
      prerequisites: row.prerequisites,
      learning_outcomes: row.learning_outcomes,
      tags: row.tags,
      created_at: row.created_at,
      test_cases: row.testcases // note: PostgreSQL returns the aggregated JSON column as lowercase "testcases"
    }));
  } catch (error) {
    logMessage(functionName, `Error fetching problems: ${error}`);
    throw error;
  }
};

export const deleteProblem = async (problemId: number): Promise<void> => {
  const functionName = "deleteProblem";
  try {
    const query = `DELETE FROM problems WHERE problem_id = $1`;
    await pool.query(query, [problemId]);
    logMessage(functionName, `Deleted problem with ID: ${problemId}`);
  } catch (error) {
    logMessage(functionName, `Error deleting problem: ${error}`);
    throw error;
  }
};
