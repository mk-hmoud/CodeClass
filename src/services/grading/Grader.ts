import pool from "../../config/db";
import { getAssignmentById } from "../../models/AssignmentModel";
import { TestResult } from "../../types";

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
      logMessage(fn, `Assignment ${assignmentId} found (grading_method=${assignment.grading_method}, points=${assignment.points})`);
  
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
  
      let finalScore = weightedTestScore + weightedPerformanceScore;
      finalScore = Math.max(0, Math.min(100, finalScore));
      finalScore = Math.round(finalScore * 100) / 100;
      logMessage(fn, `Combined finalScore (clamped, rounded) = ${finalScore}`);
  
      let gradingStatus: 'system graded' | 'graded' | 'pending' = 'pending';
      if (assignment.grading_method === 'Automatic') gradingStatus = 'graded';
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