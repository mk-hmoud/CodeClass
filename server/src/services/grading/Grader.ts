import logger from "../../config/logger";
import pool from "../../config/db";
import { getAssignmentById } from "../../models/AssignmentModel";
import { TestResult } from "../../types";
import { systemEventEmitter } from "../statistics//emitter";
import { GradeUpdatedEvent } from "../statistics/events";


export const calculateGrade = async (
  submissionId: number,
  testResults: TestResult[],
  metrics: {
    passedTests: number;
    totalTests: number;
    privatePassedTests: number;
    privateTotalTests: number;
    averageRuntime: number;
  },
  assignmentId: number
): Promise<{
  autoScore: number;
  passedTests: number;
  totalTests: number;
  gradingStatus: 'system graded' | 'graded' | 'pending';
}> => {
  const fn = 'calculateGrade';
  logger.info({ fn, submissionId, assignmentId }, "Start grading submission");
  logger.debug({ fn, metrics, testResultsCount: testResults.length }, "Grading inputs");

  try {
    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) {
      logger.error({ fn, assignmentId }, "Assignment not found");
      throw new Error(`Assignment ${assignmentId} not found`);
    }
    
    const maxPoints = assignment.points || 100;
    logger.info(
      { fn, assignmentId, grading_method: assignment.grading_method, maxPoints },
      "Loaded assignment for grading"
    );

    const weights = {
      testCasePassing: 0.85,
      privateTestWeight: 0.6,
      performance: 0.15 
    };
    logger.debug({ fn, weights }, "Using grading weights");
    
    const testCaseScore = (metrics.passedTests / metrics.totalTests) * 100;
    logger.debug(
      { fn, passedTests: metrics.passedTests, totalTests: metrics.totalTests, testCaseScore },
      "Computed raw test case score"
    );

    let publicTestScore = 0, privateTestScore = 0;
    if (metrics.privateTotalTests > 0) {
      const publicPassed = metrics.passedTests - metrics.privatePassedTests;
      const publicTotal  = metrics.totalTests  - metrics.privateTotalTests;
      publicTestScore  = publicTotal > 0
        ? (publicPassed / publicTotal) * 100 * (1 - weights.privateTestWeight)
        : 0;
      privateTestScore = (metrics.privatePassedTests / metrics.privateTotalTests) * 100 * weights.privateTestWeight;

      logger.debug(
        { fn, publicPassed, publicTotal, publicTestScore },
        "Public test score computed"
      );
      logger.debug(
        { fn, privatePassed: metrics.privatePassedTests, privateTotal: metrics.privateTotalTests, privateTestScore },
        "Private test score computed"
      );
    } else {
      publicTestScore = testCaseScore;
      logger.debug({ fn, publicTestScore }, "No private tests, using total testCaseScore as publicTestScore");
    }

    const weightedTestScore = (publicTestScore + privateTestScore) * weights.testCasePassing;
    logger.debug(
      { fn, publicTestScore, privateTestScore, weightedTestScore },
      "Weighted test score calculated"
    );

    let performanceScore = 0;
    try {
      const runtimeData = await getAssignmentRuntimeData(assignmentId);
      logger.debug({ fn, runtimeEntries: runtimeData.length }, "Fetched historical runtime entries");

      const runtimes = runtimeData
        .map(r => r.avg_runtime_ms)
        .filter(r => r > 0)
        .sort((a, b) => a - b);

      if (runtimes.length > 0) {
        const p25 = calculatePercentile(runtimes, 25);
        const median = calculatePercentile(runtimes, 50);
        const p75 = calculatePercentile(runtimes, 75);
        const maxRuntime = Math.max(...runtimes);

        logger.debug(
          { fn, p25, median, p75, maxRuntime },
          "Runtime percentiles calculated"
        );

        const rt = metrics.averageRuntime;
        if (rt <= p25) performanceScore = 100;
        else if (rt <= median) performanceScore = 80;
        else if (rt <= p75) performanceScore = 60;
        else if (rt <= maxRuntime * 0.9) performanceScore = 40;
        else performanceScore = 20;

        logger.debug(
          { fn, avgRuntime: rt, performanceScore },
          "Performance score based on runtime"
        );
      } else {
        performanceScore = 70;
        logger.info({ fn }, "No historical runtime data, using default performance score 70");
      }
    } catch (perfErr) {
      logger.error({ fn, error: perfErr }, "Error during performance calculation, using default performance score");
      performanceScore = 70;
    }

    const weightedPerformanceScore = performanceScore * weights.performance;
    logger.debug(
      { fn, performanceScore, weightedPerformanceScore },
      "Weighted performance score calculated"
    );

    let percentageScore = weightedTestScore + weightedPerformanceScore;
    percentageScore = Math.max(0, Math.min(100, percentageScore));
    
    let finalScore = (percentageScore / 100) * maxPoints;
    finalScore = Math.round(finalScore * 100) / 100; 
    
    logger.info(
      { fn, percentageScore, maxPoints, finalScore },
      "Final auto score calculated"
    );

    let gradingStatus: 'system graded' | 'graded' | 'pending' = 'pending';
    if (assignment.grading_method === 'Automatic'){ 
      gradingStatus = 'graded';
      const gradeEvent: GradeUpdatedEvent = {
        type: 'GRADE_UPDATED',
        timestamp: new Date().toISOString(),
        payload: {
          assignmentId,
          submissionId,
          finalScore
        }
      };
      systemEventEmitter.emit('GRADE_UPDATED', gradeEvent.payload);
      logger.info({ fn, submissionId, assignmentId, finalScore }, "GRADE_UPDATED event emitted (Automatic)");
    } else if (assignment.grading_method === 'Hybrid') {
      gradingStatus = 'system graded';
    }

    logger.info(
      { fn, submissionId, assignmentId, gradingStatus },
      "Grading status determined"
    );

    await updateSubmissionScore(submissionId, finalScore, gradingStatus);
    logger.info(
      { fn, submissionId, finalScore, gradingStatus },
      "Submission score updated"
    );

    return {
      autoScore: finalScore,
      passedTests: metrics.passedTests,
      totalTests:  metrics.totalTests,
      gradingStatus
    };

  } catch (err) {
    logger.error({ fn, error: err, submissionId, assignmentId }, "Unhandled error in calculateGrade");
    throw err;
  }
};

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  const index = Math.ceil((percentile / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
}


async function getAssignmentRuntimeData(assignmentId: number) {
  const fn = 'getAssignmentRuntimeData';
  try {
    const query = `
      SELECT 
        s.submission_id,
        AVG(sr.execution_time_ms) as avg_runtime_ms
      FROM 
        submissions s
      JOIN 
        submission_results sr ON s.submission_id = sr.submission_id
      WHERE 
        s.assignment_id = $1
        AND s.status = 'completed'
        AND sr.execution_time_ms IS NOT NULL
      GROUP BY 
        s.submission_id
      ORDER BY 
        s.submitted_at DESC`;  
    
    const result = await pool.query(query, [assignmentId]);
    logger.debug({ fn, assignmentId, rows: result.rowCount }, "Runtime data fetched");
    return result.rows;
  } catch (error) {
    logger.error({ fn, assignmentId, error }, "Error fetching runtime data");
    return [];
  }
}


async function updateSubmissionScore(
  submissionId: number, 
  score: number, 
  gradingStatus: 'system graded' | 'graded' | 'pending'
) {
  const fn = 'updateSubmissionScore';
  try {
    const submissionQuery = `
      SELECT 
        s.submission_id,
        a.grading_method
      FROM 
        submissions s
      JOIN 
        assignments a ON s.assignment_id = a.assignment_id
      WHERE 
        s.submission_id = $1`;
    
    const submissionResult = await pool.query(submissionQuery, [submissionId]);
    
    if (submissionResult.rowCount === 0) {
      logger.error({ fn, submissionId }, "Submission not found for update");
      throw new Error(`Submission ${submissionId} not found`);
    }
    
    const gradingMethod = submissionResult.rows[0].grading_method;
    logger.debug({ fn, submissionId, gradingMethod }, "Assignment grading method resolved");
    
    let updateQuery = '';
    let queryParams: any[] = [];
    
    if (gradingMethod === 'Automatic') {
      updateQuery = `
        UPDATE submissions 
        SET auto_score = $1, 
            grading_status = $2,
            final_score = $1
        WHERE submission_id = $3
        RETURNING *`;
      queryParams = [score, gradingStatus, submissionId];
    } else {
      updateQuery = `
        UPDATE submissions 
        SET auto_score = $1, 
            grading_status = $2
        WHERE submission_id = $3
        RETURNING *`;
      queryParams = [score, gradingStatus, submissionId];
    }
    
    const result = await pool.query(updateQuery, queryParams);
    logger.info(
      { fn, submissionId, score, gradingStatus, updateFinalScore: gradingMethod === 'Automatic' },
      "Submission score row updated"
    );
    
    return result.rows[0];
  } catch (error) {
    logger.error({ fn, submissionId, error }, "Error updating submission score");
    throw error;
  }
}

interface UpdateManualGradeParams {
  submissionId: number;
  manualScore: number;
  feedback?: string | null;
}

export async function updateManualGrade({
  submissionId,
  manualScore,
  feedback,
}: UpdateManualGradeParams) {
  const fn = "updateManualGrade";
  logger.info(
    { fn, submissionId, manualScore, feedbackPreview: feedback?.substring(0, 50) },
    "Starting manual grade update"
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const subRes = await client.query(`
      SELECT 
        s.submission_id, 
        s.assignment_id, 
        s.auto_score, 
        a.grading_method, 
        a.points
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.assignment_id
      WHERE s.submission_id = $1
      FOR UPDATE
    `, [submissionId]);

    if (subRes.rowCount === 0) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    const row = subRes.rows[0];
    const assignmentId = row.assignment_id;
    const grading_method = row.grading_method;
    const maxPoints = row.points || 100;
    
    const auto_score = row.auto_score !== null ? parseFloat(row.auto_score) : null;
    
    logger.debug(
      { fn, submissionId, assignmentId, grading_method, maxPoints, auto_score, manualScore },
      "Loaded submission and assignment for manual grading"
    );

    if (manualScore < 0 || manualScore > maxPoints) {
      throw new Error(`Manual score must be between 0 and ${maxPoints}`);
    }

    if (!['Hybrid', 'Manual'].includes(grading_method)) {
      throw new Error(`Manual grading not allowed for ${grading_method} assignments`);
    }

    let finalScore: number;
    switch (grading_method) {
      case 'Hybrid':
        if (auto_score === null) {
          throw new Error("Cannot grade Hybrid submission without system score");
        }
        
        logger.debug(
          { fn, submissionId, auto_score, manualScore },
          "Hybrid grading calculation"
        );
        finalScore = (auto_score + manualScore) / 2;
        finalScore = Number(finalScore.toFixed(2)); 
        logger.debug(
          { fn, submissionId, finalScore },
          "Hybrid final score computed"
        );
        break;
      
      case 'Manual':
        finalScore = Number(manualScore.toFixed(2));
        logger.debug(
          { fn, submissionId, finalScore },
          "Manual final score computed"
        );
        break;

      default:
        throw new Error(`Unhandled grading method: ${grading_method}`);
    }

    const updRes = await client.query(`
      UPDATE submissions
      SET manual_score = $1,
          final_score = $2,
          feedback = $3,
          grading_status = 'graded'
      WHERE submission_id = $4
      RETURNING submission_id, final_score, feedback, grading_status
    `, [manualScore, finalScore, feedback, submissionId]);

    await client.query('COMMIT');
    logger.info(
      { fn, submissionId, finalScore },
      "Manual grade updated successfully"
    );

    const gradeEvent: GradeUpdatedEvent = {
      type: 'GRADE_UPDATED',
      timestamp: new Date().toISOString(),
      payload: {
        assignmentId,
        submissionId,
        finalScore
      }
    };
    systemEventEmitter.emit('GRADE_UPDATED', gradeEvent.payload);
    logger.info(
      { fn, submissionId, assignmentId, finalScore },
      "GRADE_UPDATED event emitted (Manual/Hybrid)"
    );

    return updRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ fn, submissionId, error }, "Error updating manual grade");
    throw error;
  } finally {
    client.release();
  }
}