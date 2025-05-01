import axios from "axios";
import { isPlagiarismEnabled, processPlagiarismResults, storeFingerprint } from "../models/PlagiarismModel";
import { getSubmissionById, getSubmissionsByAssignment } from "../models/SubmissionModel";

const PLAGIARISM_URL = process.env.PLAGIARISM_URL || 'http://localhost:8001'

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [PlagiarismController.ts] [${functionName}] ${message}`);
};  

// TODO: deal with submissions done by the same user.

// temp
import pool from '../config/db'; 
async function logPlagiarismReports(submissionId: number) {
    const fn = 'logPlagiarismReports';
    const rs = await pool.query(
      `SELECT compared_submission, similarity, checked_at
         FROM plagiarism_reports
        WHERE submission_id = $1`,
      [submissionId]
    );
    console.log(
      `[${new Date().toISOString()}] [PlagiarismController.ts] [${fn}]`,
      `Reports for ${submissionId}:`,
      rs.rows
    );
  }

/*
function createCompatibleHash(originalValue: any): number {
  const str = String(originalValue);
  const MAX_SAFE_PYTHON_INT = 2147483647; // 2^31 - 1
  
  const hashCode = str.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return Math.abs(hashCode % MAX_SAFE_PYTHON_INT);
}
*/

export async function runPlagiarismCheck(submissionId: number): Promise<void> {
  const fn = "runPlagiarismCheck";
  try {
    const submission = await getSubmissionById(submissionId);
    const { assignment_id, code } = submission;
    logMessage(fn, `Submission ${submissionId} belongs to assignment ${assignment_id}`);
    
    const enabled = await isPlagiarismEnabled(assignment_id);
    if (!enabled) {
      logMessage(fn, `Assignment ${assignment_id} has plagiarism disabled. Skipping.`);
      return;
    }
    
    logMessage(fn, `Loading existing fingerprints for assignment ${assignment_id}`);
    const existingSubs = await getSubmissionsByAssignment(assignment_id, submissionId);
    logMessage(fn, `Found ${existingSubs.length} prior submissions to compare against`);
    
    if (existingSubs.length === 0) {
      logMessage(fn, `No existing submissions to compare against. Proceeding anyway to generate fingerprint.`);
    }
    
    /*
    // -- Format fingerprints correctly to match the API expectations
    const formattedSubmissions = existingSubs.map((s) => {
      // Ensure fingerprint_hashes is an array
      let fingerprint = s.fingerprint_hashes;
      
      // If fingerprint is stored as a PostgreSQL array literal string, parse it
      if (typeof fingerprint === 'string' && fingerprint.startsWith('{') && fingerprint.endsWith('}')) {
        try {
          // Parse PostgreSQL array format like '{123,456,789}'
          fingerprint = fingerprint.substring(1, fingerprint.length - 1).split(',');
        } catch (e) {
          logMessage(fn, `Error parsing fingerprint for submission ${s.submission_id}: ${e}`);
          fingerprint = [];
        }
      }
      
      const safeFingerprint = Array.isArray(fingerprint) 
        ? fingerprint.map(hash => {
            try {
              const hashStr = String(hash);
              
              const num = Number(hashStr);
              if (!isNaN(num) && num <= 2147483647 && Number.isInteger(num)) {
                return num;
              }
              
              return createCompatibleHash(hashStr);
            } catch (e) {
              logMessage(fn, `Error processing hash value: ${e}`);
              return 0; // Fallback
            }
          })
        : [];
      
      return {
        id: s.submission_id,
        fingerprint: safeFingerprint,
      };
    });
    */
    
    const formattedSubmissions = existingSubs.map(s => {
        let fp = s.fingerprint_hashes;
        if (typeof fp === 'string' && fp.startsWith('{')) {
          fp = fp.slice(1,-1).split(',').map(n => parseInt(n,10) || 0);
        }
        return { id: s.submission_id, fingerprint: Array.isArray(fp) ? fp : [] };
      });

    logMessage(fn, `Calling plagiarism microservice at ${PLAGIARISM_URL}`);
    logMessage(fn, `Request details: submissionId=${submissionId}, assignmentId=${assignment_id}`);
    
    await debugPlagiarismRequest(submissionId, assignment_id, code, formattedSubmissions);
    
    const response = await axios.post(`${PLAGIARISM_URL}/plagiarism/check`, {
      submission_id: submissionId,
      assignment_id,
      language: "cpp",
      code,
      existing_submissions: formattedSubmissions
    });
    
    if (response.data.fingerprint && Array.isArray(response.data.fingerprint)) {
      logMessage(fn, `Storing returned fingerprint (${response.data.fingerprint.length} hashes) for submission ${submissionId}`);
      await storeFingerprint(submissionId, response.data.fingerprint);
    } else {
      logMessage(fn, `No valid fingerprint returned, skipping storeFingerprint`);
    }
    
    if (response.data.results && Array.isArray(response.data.results)) {
      logMessage(fn, `Processing ${response.data.results.length} plagiarism results`);
      await processPlagiarismResults(submissionId, response.data.results);
    } else {
      logMessage(fn, `No plagiarism results array returned`);
    }
    await logPlagiarismReports(submissionId);
    
    logMessage(fn, `Completed plagiarism check for submission ${submissionId}`);
  } catch (e: any) {
    logMessage(fn, `Plagiarism check failed: ${e.message}`);
    if (e.response) {
      logMessage(fn, `Response status: ${e.response.status}`);
      logMessage(fn, `Response data: ${JSON.stringify(e.response.data)}`);
    } else if (e.request) {
      logMessage(fn, `No response received from plagiarism service`);
    }
  }
}

export async function debugPlagiarismRequest(
  submissionId: number, 
  assignmentId: number, 
  code: string, 
  existingSubs: any[]
): Promise<void> {
  const fn = "debugPlagiarismRequest";
  
  const payload = {
    submission_id: submissionId,
    assignment_id: assignmentId,
    language: "cpp",
    code,
    existing_submissions: existingSubs,
  };
  
  const debugPayload = {
    ...payload,
    code: payload.code.substring(0, 50) + "...[truncated]",
    existing_submissions: payload.existing_submissions.map(sub => ({
      id: sub.id,
      fingerprint_sample: Array.isArray(sub.fingerprint) && sub.fingerprint.length > 0 
        ? [sub.fingerprint[0], "...", sub.fingerprint[sub.fingerprint.length - 1]] 
        : sub.fingerprint,
      fingerprint_length: Array.isArray(sub.fingerprint) ? sub.fingerprint.length : 'not an array'
    }))
  };
  
  logMessage(fn, `Request payload structure: ${JSON.stringify(debugPayload, null, 2)}`);
  
  if (!Array.isArray(payload.existing_submissions)) {
    logMessage(fn, "ERROR: existing_submissions is not an array");
  }
  
  for (let i = 0; i < payload.existing_submissions.length; i++) {
    const sub = payload.existing_submissions[i];
    if (!sub.id) {
      logMessage(fn, `ERROR: Submission at index ${i} missing id`);
    }
    if (!Array.isArray(sub.fingerprint)) {
      logMessage(fn, `ERROR: Submission ${sub.id} has non-array fingerprint: ${typeof sub.fingerprint}`);
    } else if (sub.fingerprint.length === 0) {
      logMessage(fn, `WARNING: Submission ${sub.id} has empty fingerprint array`);
    } else {
      for (let j = 0; j < Math.min(5, sub.fingerprint.length); j++) {
        const val = sub.fingerprint[j];
        if (!Number.isInteger(val) || val > 2147483647 || val < 0) {
          logMessage(fn, `WARNING: Submission ${sub.id} has potentially problematic fingerprint value at index ${j}: ${val}`);
        }
      }
    }
  }
}