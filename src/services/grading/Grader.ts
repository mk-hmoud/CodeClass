import pool from "../../config/db";
import { getAssignmentById } from "../../models/AssignmentModel";
import { TestResult } from "../../types";
import { statisticsEventEmitter } from "../statistics/AssignmentAnlaysis/emitter";
import { GradeUpdatedEvent } from "../statistics/AssignmentAnlaysis/types";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Grader.ts] [${functionName}] ${message}`);
};

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
    logMessage(fn, `Start grading submission ${submissionId} for assignment ${assignmentId}`);
    logMessage(fn, `Metrics: ${JSON.stringify(metrics)}`);
    logMessage(fn, `Total test results loaded: ${testResults.length}`);
  
    try {
      const assignment = await getAssignmentById(assignmentId);
      if (!assignment) {
        logMessage(fn, `Assignment ${assignmentId} not found!`);
        throw new Error(`Assignment ${assignmentId} not found`);
      }
      
      const maxPoints = assignment.points || 100;
      logMessage(fn, `Assignment ${assignmentId} found (grading_method=${assignment.grading_method}, points=${maxPoints})`);
  
      // weights
      const weights = {
        testCasePassing: 0.85,
        privateTestWeight: 0.6,
        performance: 0.15 
      };
      logMessage(fn, `Using weights: ${JSON.stringify(weights)}`);
  
      const testCaseScore = metrics.passedTests / metrics.totalTests * 100;
      logMessage(fn, `Raw testCaseScore = (passedTests/totalTests)*100 = ${testCaseScore.toFixed(2)}`);
  
      let publicTestScore = 0, privateTestScore = 0;
      if (metrics.privateTotalTests > 0) {
        const publicPassed = metrics.passedTests - metrics.privatePassedTests;
        const publicTotal  = metrics.totalTests  - metrics.privateTotalTests;
        publicTestScore  = publicTotal > 0
          ? (publicPassed / publicTotal) * 100 * (1 - weights.privateTestWeight)
          : 0;
        privateTestScore = (metrics.privatePassedTests / metrics.privateTotalTests) * 100 * weights.privateTestWeight;
  
        logMessage(fn, `Public tests: passed=${publicPassed}/${publicTotal}, score=${publicTestScore.toFixed(2)}`);
        logMessage(fn, `Private tests: passed=${metrics.privatePassedTests}/${metrics.privateTotalTests}, score=${privateTestScore.toFixed(2)}`);
      } else {
        publicTestScore = testCaseScore;
        logMessage(fn, `No private tests → publicTestScore = ${publicTestScore.toFixed(2)}`);
      }
  
      const weightedTestScore = (publicTestScore + privateTestScore) * weights.testCasePassing;
      logMessage(fn, `Weighted test score = (public+private)*${weights.testCasePassing} = ${weightedTestScore.toFixed(2)}`);
  
      let performanceScore = 0;
      try {
        const runtimeData = await getAssignmentRuntimeData(assignmentId);
        logMessage(fn, `Fetched ${runtimeData.length} historical runtime entries`);
        const runtimes = runtimeData.map(r => r.avg_runtime_ms).filter(r => r > 0).sort((a,b)=>a-b);
  
        if (runtimes.length > 0) {
          const p25 = calculatePercentile(runtimes, 25);
          const median = calculatePercentile(runtimes, 50);
          const p75 = calculatePercentile(runtimes, 75);
          const maxRuntime = Math.max(...runtimes);
          logMessage(fn, `Runtime percentiles: 25%=${p25}, 50%=${median}, 75%=${p75}, max=${maxRuntime}`);
  
          const rt = metrics.averageRuntime;
          if (rt <= p25) performanceScore = 100;
          else if (rt <= median) performanceScore = 80;
          else if (rt <= p75) performanceScore = 60;
          else if (rt <= maxRuntime * 0.9) performanceScore = 40;
          else performanceScore = 20;
  
          logMessage(fn, `Current avg runtime = ${rt}, performanceScore = ${performanceScore}`);
        } else {
          performanceScore = 70;
          logMessage(fn, `No historical data → default performanceScore = 70`);
        }
      } catch (perfErr) {
        logMessage(fn, `Error during performance calc: ${perfErr}`);
        performanceScore = 70;
      }
  
      const weightedPerformanceScore = performanceScore * weights.performance;
      logMessage(fn, `Weighted performance = ${performanceScore} * ${weights.performance} = ${weightedPerformanceScore.toFixed(2)}`);
  
      let percentageScore = weightedTestScore + weightedPerformanceScore;
      percentageScore = Math.max(0, Math.min(100, percentageScore));
      
      let finalScore = (percentageScore / 100) * maxPoints;
      finalScore = Math.round(finalScore * 100) / 100; 
      
      logMessage(fn, `Calculated ${percentageScore}% of ${maxPoints} points = ${finalScore}`);
  
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
        statisticsEventEmitter.emit('GRADE_UPDATED', gradeEvent.payload);
      }
      else if (assignment.grading_method === 'Hybrid') gradingStatus = 'system graded';
      logMessage(fn, `Setting gradingStatus = ${gradingStatus}`);
  
      await updateSubmissionScore(submissionId, finalScore, gradingStatus);
      logMessage(fn, `Updated submission ${submissionId}: autoScore=${finalScore}, gradingStatus=${gradingStatus}`);
  
      return {
        autoScore: finalScore,
        passedTests: metrics.passedTests,
        totalTests:  metrics.totalTests,
        gradingStatus
      };
  
    } catch (err) {
      logMessage(fn, `Unhandled error: ${err}`);
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
    return result.rows;
  } catch (error) {
    logMessage('getAssignmentRuntimeData', `Error fetching runtime data: ${error}`);
    return [];
  }
}


async function updateSubmissionScore(
  submissionId: number, 
  score: number, 
  gradingStatus: 'system graded' | 'graded' | 'pending'
) {
  try {
    const query = `
      UPDATE submissions 
      SET auto_score = $1, 
          grading_status = $2,
          final_score = CASE 
                          WHEN manual_score IS NOT NULL THEN manual_score 
                          ELSE $1 
                        END
      WHERE submission_id = $3
      RETURNING *`;
    
    const result = await pool.query(query, [score, gradingStatus, submissionId]);
    return result.rows[0];
  } catch (error) {
    logMessage('updateSubmissionScore', `Error updating submission score: ${error}`);
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
  const log = (message: string) => logMessage(fn, message);
  
  log(`Starting update for submission ${submissionId}`);
  log(`Params: manualScore=${manualScore}, feedback=${feedback?.substring(0, 50)}`);

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
    
    log(`Found submission with assignment ${assignmentId} (grading method: ${grading_method}, max points: ${maxPoints})`);
    log(`Auto score: ${auto_score}, Manual score: ${manualScore}`);

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
        
        log(`Hybrid grading: auto_score=${auto_score}, manualScore=${manualScore}`);
        finalScore = (auto_score + manualScore) / 2;
        finalScore = Number(finalScore.toFixed(2)); 
        log(`Final score calculation: (${auto_score} + ${manualScore}) / 2 = ${finalScore}`);
        break;
      
      case 'Manual':
        finalScore = Number(manualScore.toFixed(2));
        log(`Manual grading: manualScore=${manualScore}, finalScore=${finalScore}`);
        break;

      default:
        throw new Error(`Unhandled grading method: ${grading_method}`);
    }

    log(`Calculated final score: ${finalScore}`);

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
    log(`Successfully updated submission ${submissionId}`);

    const gradeEvent: GradeUpdatedEvent = {
      type: 'GRADE_UPDATED',
      timestamp: new Date().toISOString(),
      payload: {
        assignmentId,
        submissionId,
        finalScore
      }
    };
    statisticsEventEmitter.emit('GRADE_UPDATED', gradeEvent.payload);

    return updRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    log(`Error updating grade: ${error}`);
    throw error;
  } finally {
    client.release();
  }
}