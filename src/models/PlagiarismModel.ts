import pool from "../config/db";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [PlagiarismModel.ts] [${functionName}] ${message}`);
};


export const storeFingerprint = async (submissionId: number, fingerprint: number[]): Promise<void> => {
  const functionName = "storeFingerprint";
  try {
    logMessage(functionName, `Storing fingerprint for submission ${submissionId}`);
    
    const query = `
      INSERT INTO submission_fingerprints (submission_id, fingerprint_hashes)
      VALUES ($1, $2)
      ON CONFLICT (submission_id) 
      DO UPDATE SET fingerprint_hashes = $2
    `;
    
    await pool.query(query, [submissionId, fingerprint]);
    logMessage(functionName, `Fingerprint stored for submission ${submissionId}`);
  } catch (error) {
    logMessage(functionName, `Error storing fingerprint: ${error}`);
    throw error;
  }
};

export const storePlagiarismReport = async (
  submissionId: number, 
  comparedSubmissionId: number, 
  similarity: number
): Promise<void> => {
  const functionName = "storePlagiarismReport";
  try {
    logMessage(functionName, `Storing plagiarism report: ${submissionId} compared with ${comparedSubmissionId}, similarity: ${similarity}%`);
    
    const query = `
      INSERT INTO plagiarism_reports (submission_id, compared_submission, similarity)
      VALUES ($1, $2, $3)
      ON CONFLICT (submission_id, compared_submission) 
      DO UPDATE SET similarity = $3
    `;
    
    await pool.query(query, [submissionId, comparedSubmissionId, similarity]);
    logMessage(functionName, `Plagiarism report stored`);
  } catch (error) {
    logMessage(functionName, `Error storing plagiarism report: ${error}`);
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
): Promise<void> => {
  const functionName = "processPlagiarismResults";
  try {
    logMessage(functionName, `Processing ${results.length} plagiarism results for submission ${submissionId}`);
    
    for (const result of results) {
      await storePlagiarismReport(
        submissionId, 
        result.compared_submission, 
        result.similarity
      );
    }
    
    logMessage(functionName, `Processed all plagiarism results for submission ${submissionId}`);
  } catch (error) {
    logMessage(functionName, `Error processing plagiarism results: ${error}`);
    throw error;
  }
};


export async function isPlagiarismEnabled(assignmentId: number): Promise<boolean> {
    const fn = "isPlagiarismEnabled";
    logMessage(fn, `Checking plagiarism flag for assignment ${assignmentId}`);
    const { rows } = await pool.query< { plagiarism_detection: boolean } >(
      `SELECT plagiarism_detection
         FROM assignments
        WHERE assignment_id = $1`,
      [assignmentId]
    );
    if (rows.length === 0) {
      logMessage(fn, `Assignment ${assignmentId} not found, defaulting to false`);
      return false;
    }
    logMessage(fn, `Assignment ${assignmentId} plagiarism_detection=${rows[0].plagiarism_detection}`);
    return rows[0].plagiarism_detection;
  }