import pool from "../config/db";
import logger from "../config/logger";
import { PlagiarismReport } from "../types";


export const storeFingerprint = async (submissionId: number, fingerprint: number[]): Promise<void> => {
  const functionName = "storeFingerprint";
  try {
    logger.info(
      { functionName, submissionId },
      `Storing fingerprint for submission ${submissionId}`
    );
    
    const query = `
      INSERT INTO submission_fingerprints (submission_id, fingerprint_hashes)
      VALUES ($1, $2)
      ON CONFLICT (submission_id) 
      DO UPDATE SET fingerprint_hashes = $2
    `;
    
    await pool.query(query, [submissionId, fingerprint]);
    logger.info(
      { functionName, submissionId },
      `Fingerprint stored for submission ${submissionId}`
    );
  } catch (error) {
    logger.error(
      { functionName, submissionId, error },
      `Error storing fingerprint: ${error}`
    );
    throw error;
  }
};

export const storePlagiarismReport = async (
  submissionId: number, 
  comparedSubmissionId: number, 
  similarity: number
): Promise<number> => {
  const functionName = "storePlagiarismReport";
  try {
    logger.info(
      { functionName, submissionId, comparedSubmissionId, similarity },
      `Storing plagiarism report: ${submissionId} compared with ${comparedSubmissionId}, similarity: ${similarity}%`
    );
    
    const query = `
      INSERT INTO plagiarism_reports (submission_id, compared_submission, similarity)
      VALUES ($1, $2, $3)
      ON CONFLICT (submission_id, compared_submission)
      DO UPDATE SET similarity = EXCLUDED.similarity
      RETURNING report_id
    `;

    const result = await pool.query<{ report_id: number }>(query, [
      submissionId,
      comparedSubmissionId,
      similarity,
    ]);

    if (result.rowCount === 0) {
      throw new Error("Failed to upsert plagiarism report");
    }

    const reportId = result.rows[0].report_id;
    logger.info(
      { functionName, reportId, submissionId, comparedSubmissionId },
      `Plagiarism report stored with report_id ${reportId}`
    );
    return reportId;
  } catch (error) {
    logger.error(
      { functionName, submissionId, comparedSubmissionId, similarity, error },
      `Error storing plagiarism report: ${error}`
    );
    throw error;
  }
};


/*
export const getSubmissionById = async (submissionId: number): Promise<any> => {
  const functionName = "getSubmissionById";
  try {
    logMessage(functionName, `Fetching submission ${submissionId}`);
    
    const query = `
      SELECT submission_id, assignment_id, code
      FROM submissions
      WHERE submission_id = $1
    `;
    
    const result = await pool.query(query, [submissionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching submission: ${error}`);
    throw error;
  }
};*/


export const processPlagiarismResults = async (
  submissionId: number,
  results: Array<{ compared_submission: number; similarity: number }>
): Promise<Array<{ id: number; submission_id: number; compared_submission: number; similarity: number; checked_at: Date }>> => {
  const functionName = "processPlagiarismResults";
  const insertedReports = [];
  
  try {
    logger.info(
      { functionName, submissionId, resultCount: results.length },
      `Processing ${results.length} plagiarism results for submission ${submissionId}`
    );
    
    for (const result of results) {
      const reportId = await storePlagiarismReport(
        submissionId,
        result.compared_submission,
        result.similarity
      );
      
      if (reportId) {
        insertedReports.push({
          id: reportId,
          submission_id: submissionId,
          compared_submission: result.compared_submission,
          similarity: result.similarity,
          checked_at: new Date()
        });
      }
    }
    
    logger.info(
      { functionName, submissionId, processedCount: insertedReports.length },
      `Processed all plagiarism results for submission ${submissionId}`
    );
    
    return insertedReports;
  } catch (error) {
    logger.error(
      { functionName, submissionId, error },
      `Error processing plagiarism results: ${error}`
    );
    throw error;
  }
};


export async function isPlagiarismEnabled(assignmentId: number): Promise<boolean> {
    const fn = "isPlagiarismEnabled";
    logger.info(
      { fn, assignmentId },
      `Checking plagiarism flag for assignment ${assignmentId}`
    );
    const { rows } = await pool.query< { plagiarism_detection: boolean } >(
      `SELECT plagiarism_detection
         FROM assignments
        WHERE assignment_id = $1`,
      [assignmentId]
    );
    if (rows.length === 0) {
      logger.warn(
        { fn, assignmentId },
        `Assignment ${assignmentId} not found, defaulting to false`
      );
      return false;
    }
    logger.info(
      { fn, assignmentId, plagiarism_detection: rows[0].plagiarism_detection },
      `Assignment ${assignmentId} plagiarism_detection=${rows[0].plagiarism_detection}`
    );
    return rows[0].plagiarism_detection;
  }


  export const getAssignmentPlagiarismReports = async (assignmentId: number): Promise<PlagiarismReport[]> => {
    const query = `
      SELECT 
        pr.report_id as "reportId",
        pr.submission_id as "submissionId",
        u1.first_name || ' ' || u1.last_name as "studentName",
        s1.code as "submission",
        pr.compared_submission as "comparedSubmissionId",
        u2.first_name || ' ' || u2.last_name as "comparedStudentName",
        s2.code as "comparedSubmission",
        pr.similarity,
        pr.checked_at as "checkedAt"
      FROM plagiarism_reports pr
      JOIN submissions s1 ON pr.submission_id = s1.submission_id
      JOIN students st1 ON s1.student_id = st1.student_id
      JOIN users u1 ON st1.user_id = u1.user_id
      JOIN submissions s2 ON pr.compared_submission = s2.submission_id
      JOIN students st2 ON s2.student_id = st2.student_id
      JOIN users u2 ON st2.user_id = u2.user_id
      WHERE s1.assignment_id = $1
      ORDER BY pr.similarity DESC
    `;
  
    try {
      const result = await pool.query(query, [assignmentId]);
      return result.rows.map(row => ({
        ...row,
        similarity: Number(row.similarity),
        checkedAt: new Date(row.checkedAt).toISOString()
      }));
    } catch (error) {
      logger.error(
        { assignmentId, error },
        "Error fetching plagiarism reports"
      );
      throw new Error("Failed to load plagiarism reports");
    }
  };