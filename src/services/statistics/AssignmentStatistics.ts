import pool from '../../config/db';
import dotenv from 'dotenv';
import { 
  SubmissionCompletedEvent,
  SubmissionCreatedEvent,
  PlagiarismDetectedEvent,
  StatisticsEvent,
  AssignmentStatistics,
  ScoreDistributionBucket,
  AttemptsDistribution,
  RuntimeDistribution,
  TestCaseStats,
  ErrorPattern,
  SubmissionTimelineEntry,
  SubmissionTrendEntry
} from './events/types';
import { TestResult } from '../../types';
import { statisticsEventEmitter } from './events/emitter';

dotenv.config();

const logMessage = (functionName: string, message: string): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [AssignmentStatistics.ts] [${functionName}] ${message}\n`);
};
  

// score distribution bucket size
const SCORE_BUCKETS = [
  { start: 0, end: 20 },
  { start: 21, end: 40 },
  { start: 41, end: 60 },
  { start: 61, end: 80 },
  { start: 81, end: 100 }
];

export class AssignmentStatisticsService {
  private static instance: AssignmentStatisticsService;

  private constructor() {
    this.registerEventListeners();
  }

  private async getSubmissionTimeline(assignmentId: number): Promise<SubmissionTimelineEntry[]> {
    const fn = 'getSubmissionTimeline';
    logMessage(fn, `ENTER assignmentId=${assignmentId}`);
    try {
      const result = await pool.query(`
        WITH submission_dates AS (
          SELECT 
            submitted_at,
            EXTRACT(DOW FROM submitted_at) as day_of_week,
            EXTRACT(HOUR FROM submitted_at) as hour_of_day
          FROM submissions
          WHERE assignment_id = $1
        )
        SELECT 
          day_of_week::int as day,
          hour_of_day::int as hour,
          COUNT(*) as count
        FROM submission_dates
        GROUP BY day_of_week, hour_of_day
        ORDER BY day_of_week, hour_of_day
      `, [assignmentId]);

      logMessage(fn, `Fetched ${result.rows.length} rows`);
      
      const snapshotTime = new Date().toISOString();
      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO assignment_submission_timeline
            (assignment_id, snapshot_time, submission_day, submission_hour, submission_count)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, snapshot_time, submission_day, submission_hour)
          DO UPDATE SET submission_count = $5
        `, [assignmentId, snapshotTime, row.day, row.hour, row.count]);
      }
      logMessage(fn, `EXIT returning ${result.rows.length} timeline entries`);
      return result.rows.map(row => ({
        day: row.day,
        hour: row.hour,
        count: parseInt(row.count, 10)
      }));
    } catch (error) {
      logMessage(fn, `Error getting submission timeline: ${error}`);
      return [];
    }
  }

  private async getSubmissionTrend(assignmentId: number): Promise<SubmissionTrendEntry[]> {
    const fn = 'getSubmissionTimeline';
    logMessage(fn, `ENTER assignmentId=${assignmentId}`);
    try {
      logMessage(fn, `Fetching submission trend data`);
      const result = await pool.query(`
        WITH submission_dates AS (
          SELECT 
            DATE_TRUNC('day', submitted_at)::date as submission_date
          FROM submissions
          WHERE assignment_id = $1
        )
        SELECT 
          submission_date,
          COUNT(*) as count
        FROM submission_dates
        GROUP BY submission_date
        ORDER BY submission_date
      `, [assignmentId]);

      logMessage(fn, `Processing ${result.rowCount} trend entries`);

      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO assignment_submission_trend
            (assignment_id, snapshot_date, submission_count)
          VALUES ($1, $2, $3)
          ON CONFLICT (assignment_id, snapshot_date)
          DO UPDATE SET submission_count = $3
        `, [assignmentId, row.submission_date, row.count]);
      }
      logMessage(fn, `Completed with ${result.rows.length} trend entries`);
      
      return result.rows.map(row => ({
        date: row.submission_date.toISOString().split('T')[0],
        count: parseInt(row.count, 10)
      }));
    } catch (error) {
      logMessage(fn, `Error processing trend data: ${error}`);
      return [];
    }
  }

  private async getMostFrequentlyMissedTestCases(assignmentId: number, limit: number = 5): Promise<TestCaseStats[]> {
    const fn = 'getMostFrequentlyMissedTestCases';
    logMessage(fn, `Starting for assignment ${assignmentId} with limit ${limit}`);
    try {
      logMessage(fn, `Querying database for missed test cases`);
      const result = await pool.query(`
        WITH test_case_failures AS (
          SELECT 
            sr.test_case_id,
            pt.is_public,
            COUNT(*) as total_runs,
            SUM(CASE WHEN NOT sr.passed THEN 1 ELSE 0 END) as failures
          FROM submission_results sr
          JOIN problem_test_cases pt ON sr.test_case_id = pt.test_case_id
          JOIN submissions s ON sr.submission_id = s.submission_id
          WHERE s.assignment_id = $1
          GROUP BY sr.test_case_id, pt.is_public
        )
        SELECT 
          test_case_id,
          is_public,
          (failures::float / total_runs) * 100 as failure_rate,
          NULL as avg_runtime_ms
        FROM test_case_failures
        ORDER BY failure_rate DESC
        LIMIT $2
      `, [assignmentId, limit]);
      logMessage(fn, `Processing ${result.rowCount} missed test cases`);
      const snapshotTime = new Date().toISOString();
      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO assignment_test_case_stats
            (assignment_id, test_case_id, snapshot_time, failure_rate, avg_runtime_ms)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, test_case_id, snapshot_time)
          DO UPDATE SET 
            failure_rate = $4,
            avg_runtime_ms = $5
        `, [assignmentId, row.test_case_id, snapshotTime, row.failure_rate, row.avg_runtime_ms]);
      }
      logMessage(fn, `Completed with ${result.rows.length} missed test case records`);
      return result.rows.map(row => ({
        testCaseId: row.test_case_id,
        failureRate: parseFloat(row.failure_rate),
        avgRuntimeMs: row.avg_runtime_ms,
        isPublic: row.is_public
      }));
    } catch (error) {
      logMessage(fn, `Failed to get missed test cases: ${error}`);
      return [];
    }
  }

  private async getTopSlowestTestCases(assignmentId: number, limit: number = 5): Promise<TestCaseStats[]> {
    const fn = 'getTopSlowestTestCases';
    logMessage(fn, `Starting for assignment ${assignmentId} with limit ${limit}`);
    try {
      logMessage(fn, `Querying database for slow test cases`);
      const result = await pool.query(`
        WITH test_case_runtimes AS (
          SELECT 
            sr.test_case_id,
            pt.is_public,
            AVG(sr.execution_time_ms) as avg_runtime_ms,
            COUNT(*) as total_runs,
            SUM(CASE WHEN NOT sr.passed THEN 1 ELSE 0 END) as failures
          FROM submission_results sr
          JOIN problem_test_cases pt ON sr.test_case_id = pt.test_case_id
          JOIN submissions s ON sr.submission_id = s.submission_id
          WHERE s.assignment_id = $1 AND sr.execution_time_ms IS NOT NULL
          GROUP BY sr.test_case_id, pt.is_public
        )
        SELECT 
          test_case_id,
          is_public,
          (failures::float / total_runs) * 100 as failure_rate,
          avg_runtime_ms
        FROM test_case_runtimes
        ORDER BY avg_runtime_ms DESC
        LIMIT $2
      `, [assignmentId, limit]);
      logMessage(fn, `Processing ${result.rowCount} slow test cases`);
      const snapshotTime = new Date().toISOString();
      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO assignment_test_case_stats
            (assignment_id, test_case_id, snapshot_time, failure_rate, avg_runtime_ms)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, test_case_id, snapshot_time)
          DO UPDATE SET 
            failure_rate = $4,
            avg_runtime_ms = $5
        `, [assignmentId, row.test_case_id, snapshotTime, row.failure_rate, row.avg_runtime_ms]);
      }
      logMessage(fn, `Completed with ${result.rows.length} slow test case records`);
      return result.rows.map(row => ({
        testCaseId: row.test_case_id,
        failureRate: parseFloat(row.failure_rate),
        avgRuntimeMs: parseFloat(row.avg_runtime_ms),
        isPublic: row.is_public
      }));
    } catch (error) {
      logMessage(fn, `Failed to get slow test cases: ${error}`);
      return [];
    }
  }

  private async getCommonErrorPatterns(assignmentId: number, limit: number = 5): Promise<ErrorPattern[]> {
    const fn = 'getCommonErrorPatterns';
    logMessage(fn, `Starting for assignment ${assignmentId} with limit ${limit}`);
    try {
      logMessage(fn, `Querying database for error patterns`);
      const result = await pool.query(`
        WITH error_patterns AS (
          SELECT 
            COALESCE(sr.error_type, 'Unknown') as error_type,
            COALESCE(sr.error_message, 'Unknown') as error_message,
            COUNT(*) as occurrence_count
          FROM submission_results sr
          JOIN submissions s ON sr.submission_id = s.submission_id
          WHERE s.assignment_id = $1 
            AND (sr.error_message IS NOT NULL OR sr.error_type IS NOT NULL)
          GROUP BY sr.error_type, sr.error_message
        )
        SELECT 
          error_type,
          error_message,
          occurrence_count
        FROM error_patterns
        ORDER BY occurrence_count DESC
        LIMIT $2
      `, [assignmentId, limit]);
      logMessage(fn, `Processing ${result.rowCount} error patterns`);
      const snapshotTime = new Date().toISOString();
      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO assignment_error_patterns
            (assignment_id, snapshot_time, error_type, error_message, occurrence_count)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, snapshot_time, error_type, error_message)
          DO UPDATE SET occurrence_count = $5
        `, [assignmentId, snapshotTime, row.error_type, row.error_message, row.occurrence_count]);
      }
      logMessage(fn, `Completed with ${result.rows.length} error patterns`);
      return result.rows.map(row => ({
        errorType: row.error_type,
        errorMessage: row.error_message,
        occurrenceCount: parseInt(row.occurrence_count, 10)
      }));
    } catch (error) {
      logMessage(fn, `Failed to get error patterns: ${error}`);
      return [];
    }
  }

  private async updateTestCaseStatistics(assignmentId: number, testResults: TestResult[]): Promise<void> {
    const fn = 'updateTestCaseStatistics';
    logMessage(fn, `Starting for assignment ${assignmentId} with ${testResults.length} test results`);
    try {
        logMessage(fn, `Mapping test results to test cases`);
        const testCaseMap = new Map<number, { passed: boolean, executionTime: number | undefined }[]>();

        for (const test of testResults) {
            if (test.testCaseId) {
                if (!testCaseMap.has(test.testCaseId)) {
                    testCaseMap.set(test.testCaseId, []);
                }
                testCaseMap.get(test.testCaseId)?.push({
                    passed: test.status === 'passed',
                    executionTime: test.executionTime
                });
            }
        }
        logMessage(fn, `Finished mapping test results. Found data for ${testCaseMap.size} unique test cases.`);

        logMessage(fn, `Starting loop to calculate and update statistics for each test case`);
        const snapshotTime = new Date().toISOString();
        for (const [testCaseId, results] of testCaseMap.entries()) {
            const totalRuns = results.length;
            const failures = results.filter(r => !r.passed).length;
            const failureRate = (failures / totalRuns) * 100;

            const validTimes = results.filter(r => typeof r.executionTime === 'number' && r.executionTime !== null && r.executionTime >= 0);
            const avgRuntime = validTimes.length > 0
                ? validTimes.reduce((sum, r) => sum + (r.executionTime || 0), 0) / validTimes.length
                : null;

            logMessage(fn, `Updating pool for test case ${testCaseId}`);
            await pool.query(`
              INSERT INTO assignment_test_case_stats
                (assignment_id, test_case_id, snapshot_time, failure_rate, avg_runtime_ms)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (assignment_id, test_case_id, snapshot_time)
              DO UPDATE SET
                failure_rate = $4,
                avg_runtime_ms = $5
            `, [assignmentId, testCaseId, snapshotTime, failureRate, avgRuntime]);
            logMessage(fn, `Finished pool update for test case ${testCaseId}`);
        }
        logMessage(fn, `Finished loop for test case statistics updates.`);

        logMessage(fn, `Completed updateTestCaseStatistics.`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logMessage(fn, `Error updating test case statistics: ${msg}`);
        throw error;
    }
}


  private async updateErrorPatterns(assignmentId: number, errorResults: TestResult[]): Promise<void> {
    const fn = 'updateErrorPatterns';
    logMessage(fn, `Starting for assignment ${assignmentId} with ${errorResults.length} error results`);
    try {
      logMessage(fn, `Grouping errors by type and message`);
      const errorMap = new Map<string, { count: number, errorType: string, errorMessage: string }>();
      
      for (const test of errorResults) {
        if (test.errorType || test.errorMessage) {
          const errorType = test.errorType || 'Unknown';
          const errorMessage = test.errorMessage || 'Unknown';
          const key = `${errorType}:${errorMessage}`;
          
          if (!errorMap.has(key)) {
            errorMap.set(key, { count: 0, errorType, errorMessage });
          }
          
          const error = errorMap.get(key)!;
          error.count++;
        }
      }
      logMessage(fn, `Finished grouping. Found ${errorMap.size} unique error patterns`);
      
      const snapshotTime = new Date().toISOString();
      logMessage(fn, `Updating error patterns in database`);
      for (const [key, error] of errorMap.entries()) {
        await pool.query(`
          INSERT INTO assignment_error_patterns
            (assignment_id, snapshot_time, error_type, error_message, occurrence_count)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, snapshot_time, error_type, error_message)
          DO UPDATE SET occurrence_count = occurrence_count + $5
        `, [assignmentId, snapshotTime, error.errorType, error.errorMessage, error.count]);
      }
      logMessage(fn, `Completed updating error patterns`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error updating error patterns: ${msg}`);
    }
    logMessage(fn, `Completed updateErrorPatterns`);
  }

  private async updateSubmissionTimeline(assignmentId: number): Promise<void> {
    const fn = 'updateSubmissionTimeline';
    logMessage(fn, `Starting for assignment ${assignmentId}`);
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hourOfDay = now.getHours();
      const snapshotTime = now.toISOString();
      
      logMessage(fn, `Updating submission timeline in database`);
      await pool.query(`
        INSERT INTO assignment_submission_timeline
          (assignment_id, snapshot_time, submission_day, submission_hour, submission_count)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (assignment_id, snapshot_time, submission_day, submission_hour)
        DO UPDATE SET submission_count = assignment_submission_timeline.submission_count + 1
      `, [assignmentId, snapshotTime, dayOfWeek, hourOfDay]);
      logMessage(fn, `Completed updating submission timeline`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error updating submission timeline: ${msg}`);
    }
    logMessage(fn, `Completed updateSubmissionTimeline`);
  }

  private async updateSubmissionTrend(assignmentId: number): Promise<void> {
    const fn = 'updateSubmissionTrend';
    logMessage(fn, `Starting for assignment ${assignmentId}`);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      logMessage(fn, `Updating submission trend in database`);
      await pool.query(`
        INSERT INTO assignment_submission_trend
          (assignment_id, snapshot_date, submission_count)
        VALUES ($1, $2, 1)
        ON CONFLICT (assignment_id, snapshot_date)
        DO UPDATE SET submission_count = assignment_submission_trend.submission_count + 1
      `, [assignmentId, today]);
      logMessage(fn, `Completed updating submission trend`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error updating submission trend: ${msg}`);
    }
    logMessage(fn, `Completed updateSubmissionTrend`);
  }

  private async updatePlagiarismStatistics(assignmentId: number): Promise<void> {
    const fn = 'updatePlagiarismStatistics';
    logMessage(fn, `Starting for assignment ${assignmentId}`);
    try {
      logMessage(fn, `Querying plagiarism data from database`);
      const result = await pool.query(`
        WITH submission_plagiarism AS (
          SELECT 
            s.submission_id,
            CASE WHEN pr.similarity IS NOT NULL AND pr.similarity >= 75 THEN 1 ELSE 0 END as is_flagged,
            pr.similarity
          FROM submissions s
          LEFT JOIN plagiarism_reports pr ON s.submission_id = pr.submission_id
          WHERE s.assignment_id = $1
        )
        SELECT 
          COUNT(*) as total_submissions,
          SUM(is_flagged) as flagged_submissions,
          AVG(CASE WHEN is_flagged = 1 THEN similarity ELSE NULL END) as avg_similarity,
          MAX(CASE WHEN is_flagged = 1 THEN similarity ELSE NULL END) as max_similarity
        FROM submission_plagiarism
      `, [assignmentId]);
      
      logMessage(fn, `Processing plagiarism statistics`);
      const plagiarismRate = result.rows[0].total_submissions > 0 
        ? (result.rows[0].flagged_submissions / result.rows[0].total_submissions) * 100
        : null;
      
      const maxSimilarity = result.rows[0].max_similarity;
      const avgSimilarity = result.rows[0].avg_similarity;
      
      const snapshotTime = new Date().toISOString();
      
      logMessage(fn, `Updating plagiarism statistics in database`);
      await pool.query(`
        UPDATE assignment_statistics
        SET 
          plagiarism_rate = $1,
          max_similarity = $2,
          avg_similarity = $3
        WHERE assignment_id = $4 AND snapshot_time::date = $5::date
      `, [plagiarismRate, maxSimilarity, avgSimilarity, assignmentId, snapshotTime]);
      logMessage(fn, `Completed updating plagiarism statistics`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error updating plagiarism statistics: ${msg}`);
    }
    logMessage(fn, `Completed updatePlagiarismStatistics`);
  }

  public async getAssignmentStatistics(assignmentId: number): Promise<AssignmentStatistics | null> {
    const fn = 'getAssignmentStatistics';
    logMessage(fn, `Starting for assignment ${assignmentId}`);
    try {
      const today = new Date().toISOString().split('T')[0];
      logMessage(fn, `Checking for recent statistics on ${today}`);
      const statsResult = await pool.query(`
        SELECT * FROM assignment_statistics
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY snapshot_time DESC
        LIMIT 1
      `, [assignmentId, today]);
      
      if (statsResult.rows.length > 0) {
        logMessage(fn, `Found recent statistics, building assignment statistics`);
        const stats = await this.buildAssignmentStatistics(assignmentId, statsResult.rows[0]);
        logMessage(fn, `Completed building assignment statistics`);
        return stats;
      } else {
        logMessage(fn, `No recent statistics found, calculating fresh statistics`);
        const stats = await this.calculateAllStatistics(assignmentId);
        logMessage(fn, `Completed calculating fresh statistics`);
        return stats;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error getting assignment statistics: ${msg}`);
      return null;
    }
  }

  private async buildAssignmentStatistics(assignmentId: number, statsRow: any): Promise<AssignmentStatistics> {
    const fn = 'buildAssignmentStatistics';
    logMessage(fn, `Starting for assignment ${assignmentId}`);
    try {
      logMessage(fn, `Fetching score distribution`);
      const scoreDistResult = await pool.query(`
        SELECT bucket_start, bucket_end, count
        FROM assignment_score_distribution
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY bucket_start
      `, [assignmentId, statsRow.snapshot_time.toISOString().split('T')[0]]);
      
      const scoreDistribution = scoreDistResult.rows.map(row => ({
        bucketStart: row.bucket_start,
        bucketEnd: row.bucket_end,
        count: row.count
      }));
      
      logMessage(fn, `Fetching attempts distribution`);
      const attemptsResult = await pool.query(`
        SELECT avg_attempts, median_attempts, max_attempts
        FROM assignment_attempts_distribution
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY snapshot_time DESC
        LIMIT 1
      `, [assignmentId, statsRow.snapshot_time.toISOString().split('T')[0]]);
      
      const attemptsDistribution = attemptsResult.rows.length > 0 ? {
        avgAttempts: attemptsResult.rows[0].avg_attempts,
        medianAttempts: attemptsResult.rows[0].median_attempts,
        maxAttempts: attemptsResult.rows[0].max_attempts
      } : {
        avgAttempts: 0,
        medianAttempts: 0,
        maxAttempts: 0
      };
      
      logMessage(fn, `Fetching runtime distribution`);
      const runtimeResult = await pool.query(`
        SELECT min_runtime_ms, percentile_25_ms, median_runtime_ms, percentile_75_ms, max_runtime_ms
        FROM assignment_runtime_distribution
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY snapshot_time DESC
        LIMIT 1
      `, [assignmentId, statsRow.snapshot_time.toISOString().split('T')[0]]);
      
      const runtimeDistribution = runtimeResult.rows.length > 0 ? {
        minRuntimeMs: runtimeResult.rows[0].min_runtime_ms,
        percentile25Ms: runtimeResult.rows[0].percentile_25_ms,
        medianRuntimeMs: runtimeResult.rows[0].median_runtime_ms,
        percentile75Ms: runtimeResult.rows[0].percentile_75_ms,
        maxRuntimeMs: runtimeResult.rows[0].max_runtime_ms
      } : {
        minRuntimeMs: null,
        percentile25Ms: null,
        medianRuntimeMs: null,
        percentile75Ms: null,
        maxRuntimeMs: null
      };
      
      logMessage(fn, `Fetching other statistics components`);
      const submissionTimeline = await this.getSubmissionTimeline(assignmentId);
      const submissionTrend = await this.getSubmissionTrend(assignmentId);
      const mostFrequentlyMissedTestCases = await this.getMostFrequentlyMissedTestCases(assignmentId);
      const topSlowestTestCases = await this.getTopSlowestTestCases(assignmentId);
      const commonErrorPatterns = await this.getCommonErrorPatterns(assignmentId);
      
      logMessage(fn, `Assembling assignment statistics object`);
      const stats: AssignmentStatistics = {
        assignmentId,
        snapshotTime: statsRow.snapshot_time.toISOString(),
        totalSubmissions: statsRow.total_submissions,
        distinctSubmitters: statsRow.distinct_submitters,
        averageScore: statsRow.average_score,
        medianScore: statsRow.median_score,
        scoreDistribution,
        attemptsDistribution,
        submissionTimeline,
        averageRuntimeMs: statsRow.average_runtime_ms,
        runtimeDistribution,
        publicTestPassRate: statsRow.public_test_pass_rate,
        privateTestPassRate: statsRow.private_test_pass_rate,
        mostFrequentlyMissedTestCases,
        topSlowestTestCases,
        commonErrorPatterns,
        submissionTrend,
        plagiarismRate: statsRow.plagiarism_rate,
        maxSimilarity: statsRow.max_similarity,
        avgSimilarity: statsRow.avg_similarity,
        runtimeErrorRate: statsRow.runtime_error_rate
      };
      logMessage(fn, `Completed assembling assignment statistics`);
      return stats;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error building assignment statistics: ${msg}`);
      throw error;
    }
  }

  public static getInstance(): AssignmentStatisticsService {
    const fn = 'getInstance';
    logMessage(fn, `Retrieving instance of AssignmentStatisticsService`);
    if (!AssignmentStatisticsService.instance) {
      logMessage(fn, `Creating new instance`);
      AssignmentStatisticsService.instance = new AssignmentStatisticsService();
    }
    logMessage(fn, `Returning instance`);
    return AssignmentStatisticsService.instance;
  }

  private registerEventListeners(): void {
    const fn = 'registerEventListeners';
    logMessage(fn, `Starting event listener registration`);
    statisticsEventEmitter.on('SUBMISSION_CREATED', this.handleSubmissionCreated.bind(this));
    statisticsEventEmitter.on('SUBMISSION_COMPLETED', this.handleSubmissionCompleted.bind(this));
    statisticsEventEmitter.on('PLAGIARISM_DETECTED', this.handlePlagiarismDetected.bind(this));
    logMessage(fn, `Event listeners registered`);
  }

  private async handleSubmissionCreated(event: StatisticsEvent): Promise<void> {
    const { submissionId, assignmentId, studentId } = (event as SubmissionCreatedEvent).payload;
    const fn = 'handleSubmissionCreated';
    logMessage(fn, `Starting for submission ${submissionId}`);
    try {
      logMessage(fn, `Updating submission timeline and trend`);
      await this.updateSubmissionTimeline(assignmentId);
      await this.updateSubmissionTrend(assignmentId);
      
      logMessage(fn, `Calculating basic statistics`);
      await this.calculateBasicStatistics(assignmentId);
      logMessage(fn, `Completed handling submission created event`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error handling submission created: ${msg}`);
    }
    logMessage(fn, `Completed handleSubmissionCreated`);
  }

  private async handleSubmissionCompleted(event: StatisticsEvent): Promise<void> {
    const { 
      submissionId, 
      assignmentId, 
      studentId, 
      score, 
      passedTests, 
      totalTests,
      publicPassedTests,
      publicTotalTests,
      privatePassedTests,
      privateTotalTests,
      averageRuntime,
      status,
      testResults
    } = (event as SubmissionCompletedEvent).payload;
    const fn = 'handleSubmissionCompleted';
    logMessage(fn, `Starting for submission ${submissionId}`);
    if (assignmentId == null) {
      logMessage('handleSubmissionCompleted', `ERROR missing assignmentId for submission ${submissionId}`);
      return;
    }
    logMessage('handleSubmissionCompleted', `Starting for submission ${submissionId}, assignment ${assignmentId}`);
    try {
      logMessage(fn, `Calculating all statistics`);
      await this.calculateAllStatistics(assignmentId);
      
      if (testResults && Array.isArray(testResults)) {
        logMessage(fn, `Updating test case statistics`);
        await this.updateTestCaseStatistics(assignmentId, testResults);
      }
      
      const errorResults = testResults?.filter(t => t.status === 'error' || t.status === 'failed');
      if (errorResults && errorResults.length > 0) {
        logMessage(fn, `Updating error patterns`);
        await this.updateErrorPatterns(assignmentId, errorResults);
      }
      logMessage(fn, `Completed handling submission completed event`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error handling submission completed: ${msg}`);
    }
    logMessage(fn, `Completed handleSubmissionCompleted`);
  }

  private async handlePlagiarismDetected(event: StatisticsEvent): Promise<void> {
    const { 
      submissionId, 
      assignmentId, 
      studentId, 
      comparedSubmissionId, 
      similarityScore 
    } = (event as PlagiarismDetectedEvent).payload;
    const fn = 'handlePlagiarismDetected';
    logMessage(fn, `Starting for submission ${submissionId}`);
    try {
      logMessage(fn, `Updating plagiarism statistics`);
      await this.updatePlagiarismStatistics(assignmentId);
      logMessage(fn, `Completed handling plagiarism detected event`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error handling plagiarism detected: ${msg}`);
    }
    logMessage(fn, `Completed handlePlagiarismDetected`);
  }

  private async calculateBasicStatistics(assignmentId: number): Promise<void> {
    const fn = 'calculateBasicStatistics';
    logMessage(fn, `Starting for assignment ${assignmentId}`);
    try {
      try {
        await pool.query('BEGIN');
        logMessage(fn, `Transaction started`);
        
        logMessage(fn, `Querying total submissions`);
        const totalSubmissionsResult = await pool.query(
          'SELECT COUNT(*) as total FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const totalSubmissions = parseInt(totalSubmissionsResult.rows[0].total, 10);
        
        logMessage(fn, `Querying distinct submitters`);
        const distinctSubmittersResult = await pool.query(
          'SELECT COUNT(DISTINCT student_id) as distinct_count FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const distinctSubmitters = parseInt(distinctSubmittersResult.rows[0].distinct_count, 10);
        
        const snapshotTime = new Date().toISOString();
        
        logMessage(fn, `Updating basic statistics in database`);
        await pool.query(`
          INSERT INTO assignment_statistics 
            (assignment_id, snapshot_time, total_submissions, distinct_submitters)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (assignment_id, snapshot_time) 
          DO UPDATE SET 
            total_submissions = $3,
            distinct_submitters = $4
        `, [assignmentId, snapshotTime, totalSubmissions, distinctSubmitters]);
        
        await pool.query('COMMIT');
        logMessage(fn, `Transaction committed`);
      } catch (error) {
        await pool.query('ROLLBACK');
        logMessage(fn, `Transaction rolled back due to error`);
        throw error;
      } finally {
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logMessage(fn, `Error calculating basic statistics: ${msg}`);
    }
    logMessage(fn, `Completed calculateBasicStatistics`);
  }

  public async calculateAllStatistics(assignmentId: number): Promise<AssignmentStatistics | null> {
    const fn = 'calculateAllStatistics';
    logMessage(fn, `Calculating all statistics for assignment ${assignmentId}`);
    
    try {
      
      try {
        await pool.query('BEGIN');
        logMessage(fn, `Transaction started`);
        
        const snapshotTime = new Date().toISOString();
        logMessage(fn, `Snapshot time: ${snapshotTime}`);
        
        logMessage(fn, `Querying total submissions`);
        const totalSubmissionsResult = await pool.query(
          'SELECT COUNT(*) as total FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const totalSubmissions = parseInt(totalSubmissionsResult.rows[0].total, 10);
        logMessage(fn, `Total submissions: ${totalSubmissions}`);
        
        logMessage(fn, `Querying distinct submitters`);
        const distinctSubmittersResult = await pool.query(
          'SELECT COUNT(DISTINCT student_id) as distinct_count FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const distinctSubmitters = parseInt(distinctSubmittersResult.rows[0].distinct_count, 10);
        logMessage(fn, `Distinct submitters: ${distinctSubmitters}`);
        
        logMessage(fn, `Querying score statistics`);
        const scoreStatsResult = await pool.query(`
          SELECT 
            COALESCE(AVG(score), 0) as average_score,
            COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score), 0) as median_score
          FROM submissions 
          WHERE assignment_id = $1
        `, [assignmentId]);
        
        const averageScore = scoreStatsResult.rows[0].average_score;
        const medianScore = scoreStatsResult.rows[0].median_score;
        logMessage(fn, `Average score: ${averageScore}, Median score: ${medianScore}`);
        
        const scoreDistribution: ScoreDistributionBucket[] = [];
        logMessage(fn, `Calculating score distribution`);
        for (const bucket of SCORE_BUCKETS) {
          logMessage(fn, `Querying bucket: ${bucket.start} - ${bucket.end}`);
          const bucketResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM submissions
            WHERE assignment_id = $1 AND score IS NOT NULL 
              AND score >= $2 AND score <= $3
          `, [assignmentId, bucket.start, bucket.end]);
          
          const count = parseInt(bucketResult.rows[0].count, 10);
          scoreDistribution.push({
            bucketStart: bucket.start,
            bucketEnd: bucket.end,
            count
          });
          
          logMessage(fn, `Saving score distribution bucket to database`);
          await pool.query(`
            INSERT INTO assignment_score_distribution
              (assignment_id, snapshot_time, bucket_start, bucket_end, count)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (assignment_id, snapshot_time, bucket_start)
            DO UPDATE SET count = $5
          `, [assignmentId, snapshotTime, bucket.start, bucket.end, count]);
        }
        logMessage(fn, `Score distribution calculated and saved`);
        
        logMessage(fn, `Querying attempts distribution`);
        const attemptsResult = await pool.query(`
          SELECT 
            AVG(submission_count) as avg_attempts,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY submission_count) as median_attempts,
            MAX(submission_count) as max_attempts
          FROM (
            SELECT student_id, COUNT(*) as submission_count
            FROM submissions
            WHERE assignment_id = $1
            GROUP BY student_id
          ) as student_attempts
        `, [assignmentId]);
        
        const attemptsDistribution: AttemptsDistribution = {
          avgAttempts: parseFloat(attemptsResult.rows[0].avg_attempts) || 0,
          medianAttempts: parseInt(attemptsResult.rows[0].median_attempts, 10) || 0,
          maxAttempts: parseInt(attemptsResult.rows[0].max_attempts, 10) || 0
        };
        logMessage(fn, `Attempts distribution: avg=${attemptsDistribution.avgAttempts}, median=${attemptsDistribution.medianAttempts}, max=${attemptsDistribution.maxAttempts}`);
        
        logMessage(fn, `Saving attempts distribution to database`);
        await pool.query(`
          INSERT INTO assignment_attempts_distribution
            (assignment_id, snapshot_time, avg_attempts, median_attempts, max_attempts)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, snapshot_time)
          DO UPDATE SET 
            avg_attempts = $3,
            median_attempts = $4,
            max_attempts = $5
        `, [
          assignmentId, 
          snapshotTime, 
          attemptsDistribution.avgAttempts,
          attemptsDistribution.medianAttempts,
          attemptsDistribution.maxAttempts
        ]);
        
        logMessage(fn, `Querying runtime statistics`);
        const runtimeResult = await pool.query(`
          WITH submission_runtimes AS (
            SELECT 
              s.submission_id,
              AVG(sr.execution_time_ms) as avg_runtime
            FROM submissions s
            JOIN submission_results sr ON s.submission_id = sr.submission_id
            WHERE s.assignment_id = $1 AND sr.execution_time_ms IS NOT NULL
            GROUP BY s.submission_id 
          )
          SELECT 
            AVG(avg_runtime) as average_runtime,
            MIN(avg_runtime) as min_runtime,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_runtime) as p25_runtime,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_runtime) as median_runtime,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_runtime) as p75_runtime,
            MAX(avg_runtime) as max_runtime
          FROM submission_runtimes
        `, [assignmentId]);
        
        const averageRuntimeMs = runtimeResult.rows[0].average_runtime;
        const runtimeDistribution: RuntimeDistribution = {
          minRuntimeMs: runtimeResult.rows[0].min_runtime,
          percentile25Ms: runtimeResult.rows[0].p25_runtime,
          medianRuntimeMs: runtimeResult.rows[0].median_runtime,
          percentile75Ms: runtimeResult.rows[0].p75_runtime,
          maxRuntimeMs: runtimeResult.rows[0].max_runtime
        };
        logMessage(fn, `Runtime statistics: avg=${averageRuntimeMs}, min=${runtimeDistribution.minRuntimeMs}, max=${runtimeDistribution.maxRuntimeMs}`);
        
        logMessage(fn, `Saving runtime distribution to database`);
        await pool.query(`
          INSERT INTO assignment_runtime_distribution
            (assignment_id, snapshot_time, min_runtime_ms, percentile_25_ms, 
             median_runtime_ms, percentile_75_ms, max_runtime_ms)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (assignment_id, snapshot_time)
          DO UPDATE SET 
            min_runtime_ms = $3,
            percentile_25_ms = $4,
            median_runtime_ms = $5,
            percentile_75_ms = $6,
            max_runtime_ms = $7
        `, [
          assignmentId, 
          snapshotTime, 
          runtimeDistribution.minRuntimeMs,
          runtimeDistribution.percentile25Ms,
          runtimeDistribution.medianRuntimeMs,
          runtimeDistribution.percentile75Ms,
          runtimeDistribution.maxRuntimeMs
        ]);
        
        logMessage(fn, `Querying test pass rates`);
        const testPassRatesResult = await pool.query(`
          WITH test_results AS (
            SELECT 
              sr.test_case_id,
              pt.is_public,
              sr.passed,
              COUNT(*) as total_count
            FROM submission_results sr
            JOIN problem_test_cases pt ON sr.test_case_id = pt.test_case_id
            JOIN submissions s ON sr.submission_id = s.submission_id
            WHERE s.assignment_id = $1
            GROUP BY sr.test_case_id, pt.is_public, sr.passed
          )
          SELECT 
            is_public,
            SUM(CASE WHEN passed THEN total_count ELSE 0 END) as passed_count,
            SUM(total_count) as total_count
          FROM test_results
          GROUP BY is_public
        `, [assignmentId]);
        
        let publicTestPassRate = null;
        let privateTestPassRate = null;
        
        for (const row of testPassRatesResult.rows) {
          const passRate = (row.passed_count / row.total_count) * 100;
          if (row.is_public) {
            publicTestPassRate = passRate;
          } else {
            privateTestPassRate = passRate;
          }
        }
        logMessage(fn, `Public test pass rate: ${publicTestPassRate}, Private test pass rate: ${privateTestPassRate}`);
        
        logMessage(fn, `Querying plagiarism statistics`);
        const plagiarismResult = await pool.query(`
          WITH submission_plagiarism AS (
            SELECT 
              s.submission_id,
              CASE WHEN pr.similarity IS NOT NULL AND pr.similarity >= 75 THEN 1 ELSE 0 END as is_flagged,
              pr.similarity
            FROM submissions s
            LEFT JOIN plagiarism_reports pr ON s.submission_id = pr.submission_id
            WHERE s.assignment_id = $1
          )
          SELECT 
            COUNT(*) as total_submissions,
            SUM(is_flagged) as flagged_submissions,
            AVG(CASE WHEN is_flagged = 1 THEN similarity ELSE NULL END) as avg_similarity,
            MAX(CASE WHEN is_flagged = 1 THEN similarity ELSE NULL END) as max_similarity
          FROM submission_plagiarism
        `, [assignmentId]);
        
        const plagiarismRate = plagiarismResult.rows[0].total_submissions > 0 
          ? (plagiarismResult.rows[0].flagged_submissions / plagiarismResult.rows[0].total_submissions) * 100
          : null;
        
        const maxSimilarity = plagiarismResult.rows[0].max_similarity;
        const avgSimilarity = plagiarismResult.rows[0].avg_similarity;
        logMessage(fn, `Plagiarism rate: ${plagiarismRate}, Max similarity: ${maxSimilarity}, Avg similarity: ${avgSimilarity}`);
        
        logMessage(fn, `Querying runtime error rate`);
        const runtimeErrorResult = await pool.query(`
          SELECT 
            COUNT(*) as total_submissions,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_submissions
          FROM submissions
          WHERE assignment_id = $1
        `, [assignmentId]);
        
        const runtimeErrorRate = runtimeErrorResult.rows[0].total_submissions > 0
          ? (runtimeErrorResult.rows[0].error_submissions / runtimeErrorResult.rows[0].total_submissions) * 100
          : null;
        logMessage(fn, `Runtime error rate: ${runtimeErrorRate}`);
        
        logMessage(fn, `Updating main statistics in database`);
        await pool.query(`
          INSERT INTO assignment_statistics
            (assignment_id, snapshot_time, total_submissions, distinct_submitters,
             average_score, median_score, average_runtime_ms,
             public_test_pass_rate, private_test_pass_rate,
             plagiarism_rate, max_similarity, avg_similarity,
             runtime_error_rate)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (assignment_id, snapshot_time)
          DO UPDATE SET
            total_submissions = $3,
            distinct_submitters = $4,
            average_score = $5,
            median_score = $6,
            average_runtime_ms = $7,
            public_test_pass_rate = $8,
            private_test_pass_rate = $9,
            plagiarism_rate = $10,
            max_similarity = $11,
            avg_similarity = $12,
            runtime_error_rate = $13
        `, [
          assignmentId,
          snapshotTime,
          totalSubmissions,
          distinctSubmitters,
          averageScore,
          medianScore,
          averageRuntimeMs,
          publicTestPassRate,
          privateTestPassRate,
          plagiarismRate,
          maxSimilarity,
          avgSimilarity,
          runtimeErrorRate
        ]);
        
        await pool.query('COMMIT');
        logMessage(fn, `Transaction committed`);
        
        logMessage(fn, `Constructing full statistics object`);
        const stats: AssignmentStatistics = {
          assignmentId,
          snapshotTime,
          totalSubmissions,
          distinctSubmitters,
          averageScore,
          medianScore,
          scoreDistribution,
          attemptsDistribution,
          submissionTimeline: await this.getSubmissionTimeline(assignmentId),
          averageRuntimeMs,
          runtimeDistribution,
          publicTestPassRate,
          privateTestPassRate,
          mostFrequentlyMissedTestCases: await this.getMostFrequentlyMissedTestCases(assignmentId),
          topSlowestTestCases: await this.getTopSlowestTestCases(assignmentId),
          commonErrorPatterns: await this.getCommonErrorPatterns(assignmentId),
          submissionTrend: await this.getSubmissionTrend(assignmentId),
          plagiarismRate,
          maxSimilarity,
          avgSimilarity,
          runtimeErrorRate
        };
        
        logMessage(fn, `Completed calculating all statistics`);
        return stats;
      } catch (error) {
        await pool.query('ROLLBACK');
        const msg = error instanceof Error ? error.message : String(error);
        logMessage(fn, `Error calculating statistics: ${msg}`);
        throw error;
      } finally {
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      logMessage(fn, `Error: ${errorMessage}\nStack: ${errorStack}`);
      throw new Error(`Statistics calculation failed: ${errorMessage}`);
    }
  }
}