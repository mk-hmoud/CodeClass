import pool from "../config/db";
import logger from "../config/logger";
import { FullSubmission, JudgeStatus, JudgeVerdict, PlagiarismReport, SubmissionRecord, SubmissionResult, TestCase, TestResult } from "../types";


export interface CreateSubmissionArgs {
  studentId: number;
  assignmentId: number;
  language: string;
  code: string;
}

export const createSubmission = async ({
    studentId,
    assignmentId,
    language,
    code,
  }: CreateSubmissionArgs): Promise<number> => {
    const functionName = "createSubmission";
    logger.info(
      { functionName, studentId, assignmentId, language },
      `Attempting to create submission for student ${studentId}, assignment ${assignmentId}, language ${language}.`
    );
    try {
      logger.debug(
        { functionName, language },
        `Querying for language ID for language: ${language}`
      );
        const langQueryResult = await pool.query(
          `SELECT language_id FROM languages WHERE name = $1`,
          [language]
        );

        if (langQueryResult.rowCount === 0) {
          logger.warn(
            { functionName, language },
            `Unsupported language: ${language}. Throwing error.`
          );
          throw new Error("Unsupported language");
        }
        const languageId = langQueryResult.rows[0].language_id;
        logger.debug(
          { functionName, language, languageId },
          `Found language ID: ${languageId} for language: ${language}.`
        );        

        logger.info(
          { functionName, studentId, assignmentId },
          `Deleting previous submissions for student ${studentId} and assignment ${assignmentId}`
        );
        const deleteResult = await pool.query(
          `DELETE FROM submissions 
          WHERE student_id = $1 AND assignment_id = $2
          RETURNING submission_id`,
          [studentId, assignmentId]
        );
        const haveDeleted = deleteResult.rowCount ?? 0;
        if (haveDeleted > 0) {
          const deletedIds = deleteResult.rows.map(row => row.submission_id).join(', ');
          logger.info(
            { functionName, studentId, assignmentId, haveDeleted, deletedIds },
            `Deleted previous submissions with IDs: ${deletedIds}`
          );
        } else {
          logger.debug(
            { functionName, studentId, assignmentId },
            `No previous submissions found to delete`
          );
        }
        /*
        logMessage(functionName, `Setting previous submissions as non-main for student ${studentId} and assignment ${assignmentId}`);
        const updateResult = await pool.query(
          `UPDATE submissions 
           SET is_main = FALSE
           WHERE student_id = $1 AND assignment_id = $2 AND is_main = TRUE
           RETURNING submission_id`,
          [studentId, assignmentId]
        );

        const updatedCount = updateResult.rowCount ?? 0;
        
        if (updatedCount > 0) {
          const updatedIds = updateResult.rows.map(row => row.submission_id).join(', ');
          logMessage(functionName, `Updated previous main submissions to non-main: ${updatedIds}`);
        } else {
          logMessage(functionName, `No previous main submissions found to update`);
        }

        */

        logger.info({ functionName }, `Inserting new submission record.`);

        const insertRes = await pool.query<{ submission_id: number }>( 
          `INSERT INTO submissions
             (student_id, assignment_id, language_id, code, status)
           VALUES ($1,$2,$3,$4, $5)
           RETURNING submission_id`,
          [studentId, assignmentId, languageId, code, 'queued']
        );

        const submissionId = insertRes.rows[0].submission_id;
        logger.info(
          { functionName, submissionId, studentId, assignmentId },
          `New submission created with ID: ${submissionId}.`
        );

        await pool.query(
          `INSERT INTO submission_attempts
          (student_id, assignment_id)
          VALUES ($1, $2)`,
          [studentId, assignmentId]
        );

        logger.debug(
          { functionName, studentId, assignmentId },
          `Inserted into submission_attempts`
        );
        logger.debug(
          { functionName, submissionId },
          `Returning submission ID ${submissionId}.`
        );
        return submissionId;

    } catch (error) {
      logger.error(
        { functionName, studentId, assignmentId, error },
        `Error creating submission for student ${studentId}, assignment ${assignmentId}: ${error}`
      );
        throw error;
    }
  };


  export const getSubmissionById = async (
    submissionId: number
  ): Promise<SubmissionRecord> => {
    const fn = "getSubmissionById";
    logger.info({ fn, submissionId }, `Fetching submission ${submissionId}`);
    const { rows, rowCount } = await pool.query<SubmissionRecord>(
      `SELECT submission_id, assignment_id, code
         FROM submissions
        WHERE submission_id = $1`,
      [submissionId]
    );
    if (rowCount === 0) {
      const err = `Submission ${submissionId} not found`;
      logger.warn({ fn, submissionId }, `Submission ${submissionId} not found`);
      throw new Error(err);
    }
    logger.info({ fn, submissionId }, `Found submission ${submissionId}`);
    return rows[0];
  };
  

export const getSubmissionsFingerprintsByAssignment = async (assignmentId: number, excludeSubmissionId?: number): Promise<any[]> => {
  const functionName = "getSubmissionsFingerprintsByAssignment";
  try {
    logger.info(
      { functionName, assignmentId, excludeSubmissionId },
      `Fetching submissions with fingerprints for assignment ${assignmentId}`
    );
    
    let query = `
      SELECT s.submission_id, sf.fingerprint_hashes 
      FROM submissions s
      INNER JOIN submission_fingerprints sf ON s.submission_id = sf.submission_id
      WHERE s.assignment_id = $1 AND s.status = 'completed'
    `;
    
    const params = [assignmentId];
    
    if (excludeSubmissionId) {
      query += ` AND s.submission_id != $2`;
      params.push(excludeSubmissionId);
    }
    
    const result = await pool.query(query, params);
    logger.info(
      { functionName, assignmentId, excludeSubmissionId, count: result.rows.length },
      `Found ${result.rows.length} submissions with fingerprints`
    );
    
    return result.rows;
  } catch (error) {
    logger.error(
      { functionName, assignmentId, excludeSubmissionId, error },
      `Error fetching submissions: ${error}`
    );
    throw error;
  }
};

export function updateSubmissionStatus(
  submissionId: number,
  status: string
): Promise<void> {
  const fn = "updateSubmissionStatus";
  const validStatuses = new Set(["queued", "running", "completed", "error"]);

  if (!validStatuses.has(status)) {
    return Promise.reject(
      new Error(`Invalid status '${status}' for submission ${submissionId}`)
    );
  }

  logger.info(
    { fn, submissionId, status },
    `Attempting to update submission ${submissionId} → ${status}`
  );

  const queryText = `
    UPDATE submissions
    SET status = $1
    WHERE submission_id = $2
    RETURNING submission_id, status`;

  const params = [status, submissionId];

  return pool
    .query(queryText, params)
    .then((result) => {
      if (result.rowCount === 0) {
        throw new Error(`Submission ${submissionId} not found`);
      }
      logger.info(
        { fn, submissionId, status },
        `Successfully updated submission ${submissionId} to ${status}`
      );
      
    })
    .catch((err) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;

      
      logger.error(
        { fn, submissionId, status, error: errorMessage, stack: errorStack },
        `FAILED updating submission ${submissionId}: ${errorMessage}`
      );

      console.error({
        context: fn,
        submissionId,
        status,
        error: errorMessage,
        stack: errorStack,
      });

      throw new Error(`Failed to update submission status: ${errorMessage}`);
    });
}


export async function getSubmissionsByAssignment(
  assignmentId: number
): Promise<FullSubmission[]> {
  const fn = "getSubmissionsByAssignment";
  logger.info(
    { fn, assignmentId },
    `Fetching submissions for assignment ${assignmentId}`
  );
  
  const client = await pool.connect();
  try {
    const { rows: assignmentRows } = await client.query(
      `SELECT problem_id FROM assignments WHERE assignment_id = $1`,
      [assignmentId]
    );
    
    if (assignmentRows.length === 0) {
      throw new Error(`Assignment with ID ${assignmentId} not found`);
    }
    
    const problemId = assignmentRows[0].problem_id;
    
    const { rows: testCaseRows } = await client.query(
      `SELECT test_case_id, input, expected_output, is_public 
       FROM problem_test_cases 
       WHERE problem_id = $1`,
      [problemId]
    );
    
    const testCasesMap = new Map<number, TestCase>();
    for (const tc of testCaseRows) {
      testCasesMap.set(tc.test_case_id, {
        testCaseId: tc.test_case_id,
        input: tc.input,
        expectedOutput: tc.expected_output,
        isPublic: tc.is_public
      });
    }
    
    const { rows: subs } = await client.query(
      `
      SELECT
        s.submission_id,
        s.student_id,
        s.assignment_id,
        s.language_id,
        s.code,
        s.submitted_at,
        s.passed_tests,
        s.total_tests,
        s.grading_status,
        s.auto_score,
        s.manual_score,
        s.final_score,
        s.status,
        s.feedback,
        u.first_name  AS "firstName",
        u.last_name   AS "lastName"
      FROM submissions s
      JOIN students st ON s.student_id = st.student_id
      JOIN users    u  ON st.user_id    = u.user_id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
      `,
      [assignmentId]
    );

    const submissionIds = subs.map(r => r.submission_id);
    if (submissionIds.length === 0) return [];
    
    const { rows: resultsRows } = await client.query(
      `SELECT submission_id, test_case_id, passed,
        actual_output, execution_time_ms, memory_usage_kb, error_message
      FROM submission_results
      WHERE submission_id = ANY($1)`,
      [submissionIds]
    );
    
    const { rows: plagRows } = await client.query(
      `SELECT report_id, submission_id, compared_submission, similarity, checked_at
      FROM plagiarism_reports
      WHERE submission_id = ANY($1)`,
      [submissionIds]
    );
    
    const verdictMap = new Map<number, JudgeVerdict>();
    
    const submissionResultsMap = new Map<number, any[]>();
    for (const r of resultsRows) {
      const arr = submissionResultsMap.get(r.submission_id) ?? [];
      arr.push(r);
      submissionResultsMap.set(r.submission_id, arr);
    }
    
    for (const sub of subs) {
      const submissionResults = submissionResultsMap.get(sub.submission_id) || [];
      const testResults: TestResult[] = submissionResults.map(r => {
        const testCase = testCasesMap.get(r.test_case_id);
        
        return {
          testCaseId: r.test_case_id,
          input: testCase?.input ? [testCase.input] : [],
          actual: r.actual_output || undefined,
          expectedOutput: testCase?.expectedOutput,
          executionTime: r.execution_time_ms || undefined,
          status: r.passed ? 'passed' : (r.error_message ? 'error' : 'failed'),
          errorMessage: r.error_message || undefined,
          isPublic: testCase?.isPublic
        };
      });
      
      let status: JudgeStatus;
      if (sub.status === 'pending' || sub.status === 'queued' || sub.status === 'running') {
        status = 'pending';
      } else if (sub.status === 'error') {
        status = 'system_error';
      } else if (submissionResults.some(r => r.error_message && r.error_message.includes('compile'))) {
        status = 'compile_error';
      } else {
        status = 'completed';
      }
      
      const passedTests = submissionResults.filter(r => r.passed).length;
      const totalTests = submissionResults.length;
      const privateResults = submissionResults.filter(r => {
        const testCase = testCasesMap.get(r.test_case_id);
        return testCase && !testCase.isPublic;
      });
      const privatePassedTests = privateResults.filter(r => r.passed).length;
      
      const verdict: JudgeVerdict = {
        status,
        testResults,
        metrics: {
          passedTests,
          totalTests,
          averageRuntime: submissionResults.reduce((sum, r) => sum + (r.execution_time_ms || 0), 0) / 
                           (submissionResults.length || 1),
          memoryUsage: Math.max(...submissionResults.map(r => r.memory_usage_kb || 0), 0),
          privatePassedTests,
          privateTestsTotal: privateResults.length
        }
      };
      
      if (status === 'compile_error' || status === 'system_error') {
        const errorResult = submissionResults.find(r => r.error_message);
        if (errorResult) {
          verdict.error = {
            errorType: status === 'compile_error' ? 'CompilationError' : 'RuntimeError',
            errorMessage: errorResult.error_message || 'Unknown error',
            fullError: errorResult.error_message || 'Unknown error'
          };
        }
      }
      
      verdictMap.set(sub.submission_id, verdict);
    }

    console.log(verdictMap);
    
    const plagMap = new Map<number, PlagiarismReport[]>();
    for (const p of plagRows) {
      const arr = plagMap.get(p.submission_id) ?? [];
      arr.push({
        reportId: p.report_id,
        submissionId: p.submission_id,
        comparedSubmission: p.compared_submission,
        similarity: Number(p.similarity),
        checkedAt: p.checked_at.toISOString()
      });
      plagMap.set(p.submission_id, arr);
    }
    
    return subs.map(row => ({
      submissionId: row.submission_id,
      studentId: row.student_id,
      studentName: `${row.firstName} ${row.lastName}`,
      assignmentId: row.assignment_id,
      languageId: row.language_id,
      code: row.code,
      submittedAt: row.submitted_at.toISOString(),
      passedTests: row.passed_tests,
      totalTests: row.total_tests,
      gradingStatus: row.grading_status,
      autoScore: row.auto_score !== null ? Number(row.auto_score) : null,
      manualScore: row.manual_score !== null ? Number(row.manual_score) : null,
      finalScore: row.final_score !== null ? Number(row.final_score) : null,
      verdict: verdictMap.get(row.submission_id) || { status: 'pending' },
      plagiarismReports: plagMap.get(row.submission_id) || []
    }));
  } catch (err) {
    logger.error(
      { fn, assignmentId, error: err },
      `Error fetching submissions: ${err}`
    );
    throw err;
  } finally {
    client.release();
  }
}

export function saveSubmissionResults(
  submissionId: number,
  testResults: TestResult[]
): Promise<void> {
  const functionName = "saveSubmissionResults";
  logger.info(
    { functionName, submissionId, testCaseCount: testResults.length },
    `Saving submission results for submission ${submissionId} with ${testResults.length} test cases.`
  );

  return pool
    .connect()
    .then((client) => {
      const submissionIds: number[] = [];
      const testCaseIds: number[] = [];
      const passedArray: boolean[] = [];
      const actualOutputs: (string | null)[] = [];
      const executionTimes: (number | null)[] = [];
      const memoryUsages: (number | null)[] = [];
      const errorMessages: (string | null)[] = [];

      for (const result of testResults) {
        submissionIds.push(submissionId);
        testCaseIds.push(result.testCaseId ?? 0);
        passedArray.push(result.status === "passed");
        actualOutputs.push(result.actual ?? null);
        executionTimes.push(result.executionTime ?? null);
        errorMessages.push(result.errorMessage ?? null);
      }

      return client
        .query(
          `
      INSERT INTO submission_results (
        submission_id,
        test_case_id,
        passed,
        actual_output,
        execution_time_ms,
        memory_usage_kb,
        error_message
      )
      SELECT * FROM UNNEST (
        $1::integer[],
        $2::integer[],
        $3::boolean[],
        $4::text[],
        $5::integer[],
        $6::integer[],
        $7::text[]
      )
    `,
          [
            submissionIds,
            testCaseIds,
            passedArray,
            actualOutputs,
            executionTimes,
            memoryUsages,
            errorMessages,
          ]
        )
        .then(() => {
          logger.info(
            { functionName, submissionId, testCaseCount: testResults.length },
            `Successfully inserted ${testResults.length} test results for submission ${submissionId}.`
          );
        })
        .catch((err) => {
          logger.error(
            { functionName, submissionId, error: err },
            `Error saving submission results: ${err}`
          );
          throw err;
        })
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}
