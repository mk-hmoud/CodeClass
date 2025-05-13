import pool from "../config/db";
import { FullSubmission, PlagiarismReport, SubmissionRecord, SubmissionResult } from "../types";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SubmissionModel.ts] [${functionName}] ${message}`);
};

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
    logMessage(functionName, `Attempting to create submission for student ${studentId}, assignment ${assignmentId}, language ${language}.`);
    try {
        logMessage(functionName, `Querying for language ID for language: ${language}`);
        const langQueryResult = await pool.query(
          `SELECT language_id FROM languages WHERE name = $1`,
          [language]
        );

        if (langQueryResult.rowCount === 0) {
          logMessage(functionName, `Unsupported language: ${language}. Throwing error.`);
          throw new Error("Unsupported language");
        }
        const languageId = langQueryResult.rows[0].language_id;
        logMessage(functionName, `Found language ID: ${languageId} for language: ${language}.`);


        logMessage(functionName, `Counting existing submissions for student ${studentId} on assignment ${assignmentId}.`);
        const attemptRes = await pool.query<{ cnt: string }>(
          `SELECT COUNT(*) AS cnt FROM submissions
           WHERE student_id=$1 AND assignment_id=$2`,
          [studentId, assignmentId]
        );
        const attempts = parseInt(attemptRes.rows[0].cnt, 10);
        logMessage(functionName, `Student ${studentId} has ${attempts} existing submissions for assignment ${assignmentId}.`);


        logMessage(functionName, `Getting maximum allowed submissions for assignment ${assignmentId}.`);
        const maxRes = await pool.query<{ submission_attempts: number | null }>( 
          `SELECT max_submissions FROM assignments WHERE assignment_id=$1`, 
          [assignmentId]
        );

         if (maxRes.rowCount === 0) {
            logMessage(functionName, `Assignment ${assignmentId} not found when checking max submissions. Throwing error.`);
            throw new Error("Assignment not found when checking submission attempts");
         }

        const maxAttempts = maxRes.rows[0].submission_attempts;
        logMessage(functionName, `Maximum submissions allowed for assignment ${assignmentId}: ${maxAttempts === null ? 'Unlimited' : maxAttempts}.`);


        logMessage(functionName, `Checking if submission limit reached (attempts: ${attempts}, max: ${maxAttempts}).`);
        if (maxAttempts != null && attempts >= maxAttempts) {
          logMessage(functionName, `Max submission attempts (${maxAttempts}) reached for student ${studentId} on assignment ${assignmentId}. Throwing error.`);
          throw new Error(`Max submission attempts (${maxAttempts}) reached`);
        }
        logMessage(functionName, `Submission limit not reached.`);

        logMessage(functionName, `Deleting previous submissions for student ${studentId} and assignment ${assignmentId}`);
        const deleteResult = await pool.query(
          `DELETE FROM submissions 
          WHERE student_id = $1 AND assignment_id = $2
          RETURNING submission_id`,
          [studentId, assignmentId]
        );
        const haveDeleted = deleteResult.rowCount ?? 0;
        if (haveDeleted > 0) {
          const deletedIds = deleteResult.rows.map(row => row.submission_id).join(', ');
          logMessage(functionName, `Deleted previous submissions with IDs: ${deletedIds}`);
        } else {
          logMessage(functionName, `No previous submissions found to delete`);
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

        logMessage(functionName, `Inserting new submission record.`);

        const insertRes = await pool.query<{ submission_id: number }>( 
          `INSERT INTO submissions
             (student_id, assignment_id, language_id, code, status) -- Added 'status' column assuming it exists
           VALUES ($1,$2,$3,$4, $5)
           RETURNING submission_id`,
          [studentId, assignmentId, languageId, code, 'queued']
        );

        const submissionId = insertRes.rows[0].submission_id;
        logMessage(functionName, `New submission created with ID: ${submissionId}.`);

        logMessage(functionName, `Returning submission ID ${submissionId}.`);
        return submissionId;

    } catch (error) {
        logMessage(functionName, `Error creating submission for student ${studentId}, assignment ${assignmentId}: ${error}`);
        throw error;
    }
  };


  export const getSubmissionById = async (
    submissionId: number
  ): Promise<SubmissionRecord> => {
    const fn = "getSubmissionById";
    logMessage(fn, `Fetching submission ${submissionId}`);
    const { rows, rowCount } = await pool.query<SubmissionRecord>(
      `SELECT submission_id, assignment_id, code
         FROM submissions
        WHERE submission_id = $1`,
      [submissionId]
    );
    if (rowCount === 0) {
      const err = `Submission ${submissionId} not found`;
      logMessage(fn, err);
      throw new Error(err);
    }
    logMessage(fn, `Found submission ${submissionId}`);
    return rows[0];
  };
  

export const getSubmissionsFingerprintsByAssignment = async (assignmentId: number, excludeSubmissionId?: number): Promise<any[]> => {
  const functionName = "getSubmissionsFingerprintsByAssignment";
  try {
    logMessage(functionName, `Fetching submissions with fingerprints for assignment ${assignmentId}`);
    
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
    logMessage(functionName, `Found ${result.rows.length} submissions with fingerprints`);
    
    return result.rows;
  } catch (error) {
    logMessage(functionName, `Error fetching submissions: ${error}`);
    throw error;
  }
};

export async function updateSubmissionStatus(
  submissionId: number,
  status: string
): Promise<void> {
  const fn = "updateSubmissionStatus";
  const validStatuses = new Set(['queued', 'running', 'completed', 'error']);
  
  try {

    if (!validStatuses.has(status)) {
      throw new Error(`Invalid status '${status}' for submission ${submissionId}`);
    }

    logMessage(fn, `Attempting to update submission ${submissionId} → ${status}`);

    const queryText = `
      UPDATE submissions 
      SET status = $1
      WHERE submission_id = $2
      RETURNING submission_id, status`;
    
    const params = [status, submissionId];
    
    const result = await pool.query(queryText, params);

    if (result.rowCount === 0) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    logMessage(fn, `Successfully updated submission ${submissionId} to ${status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logMessage(fn, `FAILED updating submission ${submissionId}: ${errorMessage}`);
    console.error({
      context: fn,
      submissionId,
      status,
      error: errorMessage,
      stack: errorStack
    });

    throw new Error(`Failed to update submission status: ${errorMessage}`);
  }
}


export async function getSubmissionsByAssignment(
  assignmentId: number
): Promise<FullSubmission[]> {
  const fn = "getSubmissionsByAssignment";
  logMessage(fn, `Fetching submissions for assignment ${assignmentId}`);
  const client = await pool.connect();
  try {
    const { rows: subs } = await client.query(
      `SELECT 
         submission_id, student_id, assignment_id,
         language_id, code, submitted_at,
         passed_tests, total_tests, grading_status,
         auto_score, manual_score, final_score
       FROM submissions
       WHERE assignment_id = $1
       ORDER BY submitted_at DESC`,
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

    const resultsMap = new Map<number, SubmissionResult[]>();
    for (const r of resultsRows) {
      const arr = resultsMap.get(r.submission_id) ?? [];
      arr.push({
        testCaseId:      r.test_case_id,
        passed:          r.passed,
        actualOutput:    r.actual_output,
        executionTimeMs: r.execution_time_ms,
        memoryUsageKb:   r.memory_usage_kb,
        errorMessage:    r.error_message
      });
      resultsMap.set(r.submission_id, arr);
    }

    const plagMap = new Map<number, PlagiarismReport[]>();
    for (const p of plagRows) {
      const arr = plagMap.get(p.submission_id) ?? [];
      arr.push({
        reportId:           p.report_id,
        submissionId:       p.submission_id,
        comparedSubmission: p.compared_submission,
        similarity:         Number(p.similarity),
        checkedAt:          p.checked_at.toISOString()
      });
      plagMap.set(p.submission_id, arr);
    }

    return subs.map(row => ({
      submissionId:      row.submission_id,
      studentId:         row.student_id,
      assignmentId:      row.assignment_id,
      languageId:        row.language_id,
      code:              row.code,
      submittedAt:       row.submitted_at.toISOString(),
      passedTests:       row.passed_tests,
      totalTests:        row.total_tests,
      gradingStatus:   row.grading_status,
      autoScore:       row.auto_score !== null ? Number(row.auto_score) : null,
      manualScore:     row.manual_score !== null ? Number(row.manual_score) : null,
      finalScore:      row.final_score !== null ? Number(row.final_score) : null,
      results:           resultsMap.get(row.submission_id) || [],
      plagiarismReports: plagMap.get(row.submission_id) || []
    }));
  } catch (err) {
    logMessage(fn, `Error fetching submissions: ${err}`);
    throw err;
  } finally {
    client.release();
  }
}