import { Request, Response } from 'express';
import axios from "axios";
import { getAssignmentPlagiarismReports, isPlagiarismEnabled, processPlagiarismResults, storeFingerprint } from "../models/PlagiarismModel";
import { getSubmissionById, getSubmissionsFingerprintsByAssignment } from "../models/SubmissionModel";
import { getAssignmentById } from '../models/AssignmentModel';
import pool from '../config/db';
import { systemEventEmitter } from '../services/statistics/emitter';
export interface PlagiarismDetectedEvent {
  type: 'PLAGIARISM_DETECTED';
  timestamp: string;
  payload: {
    submissionId: number;
    assignmentId: number;
    studentId?: number;
    comparedSubmissionId: number;
    similarityScore: number;
    reportId?: number;
    classroomId?: number;
  };
}

const PLAGIARISM_URL = process.env.PLAGIARISM_URL || 'http://localhost:8001'

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [PlagiarismController.ts] [${functionName}] ${message}`);
};

// TODO: deal with submissions done by the same user.

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

export function emitPlagiarismDetectedEvent(
  submissionId: number, 
  assignmentId: number,
  comparedSubmissionId: number,
  similarityScore: number,
  studentId?: number,
  reportId?: number,
  classroomId?: number
): void {
  const fn = "emitPlagiarismDetectedEvent";
  
  try {
    const plagiarismEvent: PlagiarismDetectedEvent = {
      type: 'PLAGIARISM_DETECTED',
      timestamp: new Date().toISOString(),
      payload: {
        submissionId,
        assignmentId,
        studentId,
        comparedSubmissionId,
        similarityScore,
        reportId,
        classroomId
      }
    };
    
    logMessage(fn, `Emitting PLAGIARISM_DETECTED event for submission ${submissionId} vs ${comparedSubmissionId} with similarity ${similarityScore}`);
    systemEventEmitter.emit('PLAGIARISM_DETECTED', plagiarismEvent.payload);
  } catch (error) {
    logMessage(fn, `Failed to emit plagiarism event: ${error}`);
  }
}

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
    const existingSubs = await getSubmissionsFingerprintsByAssignment(assignment_id, submissionId);
    logMessage(fn, `Found ${existingSubs.length} prior submissions to compare against`);
    if (existingSubs.length === 0) {
      logMessage(fn, `No existing submissions to compare against. Proceeding anyway to generate fingerprint.`);
    }

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
      const plagiarismReports = await processPlagiarismResults(submissionId, response.data.results);
      
      if (plagiarismReports && plagiarismReports.length > 0) {
        const assignment = await getAssignmentById(assignment_id);
        const classroomId = assignment ? assignment.classroomId : undefined;
        
        const studentQuery = await pool.query(
          `SELECT student_id FROM submissions WHERE submission_id = $1`,
          [submissionId]
        );
        const studentId = studentQuery.rows[0]?.student_id;
        
        const SIMILARITY_THRESHOLD = 0.3; // 30% similarity threshold
        
        for (const report of plagiarismReports) {
          const { compared_submission, similarity, id: reportId } = report;
          
          if (similarity >= SIMILARITY_THRESHOLD) {
            logMessage(fn, `Detected plagiarism: submission ${submissionId} has ${similarity * 100}% similarity with submission ${compared_submission}`);
            
            emitPlagiarismDetectedEvent(
              submissionId,
              assignment_id,
              compared_submission,
              similarity,
              studentId,
              reportId,
              classroomId
            );
          }
        }
      }
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

export const getAssignmentPlagiarismReportsController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getAssignmentPlagiarismReportsController';
  try {
    const assignmentId = Number(req.params.assignmentId);
    logMessage(functionName, `Received request to fetch plagiarism reports for assignment ID: ${assignmentId}`);
    
    if (isNaN(assignmentId) || assignmentId <= 0) {
      logMessage(functionName, `Invalid assignment ID: ${req.params.assignmentId}`);
      res.status(400).json({ success: false, message: 'Invalid assignment ID' });
      return;
    }
    
    if (!req.user) {
      logMessage(functionName, "No user information found in request");
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    if (req.user.role !== "instructor") {
      logMessage(functionName, `User ${req.user.id} with role ${req.user.role} attempted to access plagiarism reports`);
      res.status(403).json({ success: false, message: 'Forbidden: instructor role required' });
      return;
    }
    
    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) {
      logMessage(functionName, `Assignment with ID ${assignmentId} not found`);
      res.status(404).json({ success: false, message: 'Assignment not found' });
      return;
    }
    
    if (!assignment.plagiarism_detection) {
      logMessage(functionName, `Plagiarism detection is not enabled for assignment ${assignmentId}`);
      res.status(200).json({
        success: true,
        data: {
          reports: [],
          plagiarismEnabled: false
        }
      });
      return;
    }
    
    const reports = await getAssignmentPlagiarismReports(assignmentId);
    logMessage(functionName, `Fetched ${reports.length} plagiarism reports for assignment ID: ${assignmentId}`);
    
    res.status(200).json({
      success: true,
      data: {
        reports
      }
    });
  } catch (error) {
    logMessage(functionName, `Error fetching plagiarism reports: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch plagiarism reports' });
  }
};