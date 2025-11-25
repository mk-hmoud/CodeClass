import logger from '../../../config/logger';
import pool from '../../../config/db';
import dotenv from 'dotenv';
import { 
  SubmissionCompletedEvent,
  SubmissionCreatedEvent,
  PlagiarismDetectedEvent,
  AssignmentStatistics,
  ScoreDistributionBucket,
  AttemptsDistribution,
  RuntimeDistribution,
  TestCaseStats,
  ErrorPattern,
  SubmissionTimelineEntry,
  SubmissionTrendEntry,
  GradeUpdatedEvent
} from '../events';
import { TestResult } from '../../../types';
import { systemEventEmitter } from '../emitter';

dotenv.config();


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
    logger.debug(
      { function: fn, assignmentId },
      'ENTER getSubmissionTimeline'
    );
  
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
  
      logger.debug(
        { function: fn, assignmentId, rowCount: result.rows.length },
        'Fetched timeline rows'
      );
      
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
  
      logger.debug(
        { function: fn, assignmentId, rowCount: result.rows.length },
        'EXIT getSubmissionTimeline'
      );
  
      return result.rows.map(row => ({
        day: row.day,
        hour: row.hour,
        count: parseInt(row.count, 10)
      }));
    } catch (error) {
      logger.error(
        { function: fn, assignmentId, error },
        'Error getting submission timeline'
      );
      return [];
    }
  }  

  private async getSubmissionTrend(assignmentId: number): Promise<SubmissionTrendEntry[]> {
    const fn = 'getSubmissionTrend';
    logger.debug(
      { function: fn, assignmentId },
      'ENTER getSubmissionTrend'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId },
        'Fetching submission trend data'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId, rowCount: result.rowCount },
        'Processing submission trend entries'
      );
  
      for (const row of result.rows) {
        await pool.query(`
          INSERT INTO assignment_submission_trend
            (assignment_id, snapshot_date, submission_count)
          VALUES ($1, $2, $3)
          ON CONFLICT (assignment_id, snapshot_date)
          DO UPDATE SET submission_count = $3
        `, [assignmentId, row.submission_date, row.count]);
      }
  
      logger.debug(
        { function: fn, assignmentId, rowCount: result.rows.length },
        'Completed submission trend calculation'
      );
      
      return result.rows.map(row => ({
        date: row.submission_date.toISOString().split('T')[0],
        count: parseInt(row.count, 10)
      }));
    } catch (error) {
      logger.error(
        { function: fn, assignmentId, error },
        'Error processing trend data'
      );
      return [];
    }
  }  

  private async getMostFrequentlyMissedTestCases(
    assignmentId: number, 
    limit: number = 5
  ): Promise<TestCaseStats[]> {
    const fn = 'getMostFrequentlyMissedTestCases';
    logger.debug(
      { function: fn, assignmentId, limit },
      'Starting most frequently missed test cases query'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId, limit },
        'Querying database for missed test cases'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId, limit, rowCount: result.rowCount },
        'Processing missed test cases'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId, limit, rowCount: result.rowCount },
        'Completed most frequently missed test cases query'
      );
  
      return result.rows.map(row => ({
        testCaseId: row.test_case_id,
        failureRate: parseFloat(row.failure_rate),
        avgRuntimeMs: row.avg_runtime_ms,
        isPublic: row.is_public
      }));
    } catch (error) {
      logger.error(
        { function: fn, assignmentId, limit, error },
        'Failed to get missed test cases'
      );
      return [];
    }
  }  

  private async getTopSlowestTestCases(
    assignmentId: number,
    limit: number = 5
  ): Promise<TestCaseStats[]> {
    const fn = 'getTopSlowestTestCases';
    logger.debug(
      { function: fn, assignmentId, limit },
      'Starting slow test cases query'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId, limit },
        'Querying database for slow test cases'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId, limit, rowCount: result.rowCount },
        'Processing slow test cases'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId, limit, rowCount: result.rows.length },
        'Completed slow test case statistics'
      );
  
      return result.rows.map(row => ({
        testCaseId: row.test_case_id,
        failureRate: parseFloat(row.failure_rate),
        avgRuntimeMs: parseInt(row.avg_runtime_ms),
        isPublic: row.is_public
      }));
    } catch (error) {
      logger.error(
        { function: fn, assignmentId, limit, error },
        'Failed to get slow test cases'
      );
      return [];
    }
  }  

  private async getCommonErrorPatterns(
    assignmentId: number,
    limit: number = 5
  ): Promise<ErrorPattern[]> {
    const fn = 'getCommonErrorPatterns';
    logger.debug(
      { function: fn, assignmentId, limit },
      'Starting common error patterns query'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId, limit },
        'Querying database for error patterns'
      );
  
      const result = await pool.query(`
        WITH error_patterns AS (
          SELECT 
            COALESCE(sr.error_message, 'Unknown') as error_message,
            COUNT(*) as occurrence_count
          FROM submission_results sr
          JOIN submissions s ON sr.submission_id = s.submission_id
          WHERE s.assignment_id = $1 
            AND sr.error_message IS NOT NULL
          GROUP BY sr.error_message
        )
        SELECT 
          'Runtime Error' as error_type,
          error_message,
          occurrence_count
        FROM error_patterns
        ORDER BY occurrence_count DESC
        LIMIT $2
      `, [assignmentId, limit]);
  
      logger.debug(
        { function: fn, assignmentId, limit, rowCount: result.rowCount },
        'Processing error patterns'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId, limit, rowCount: result.rows.length },
        'Completed common error patterns calculation'
      );
  
      return result.rows.map(row => ({
        errorType: row.error_type,
        errorMessage: row.error_message,
        occurrenceCount: parseInt(row.occurrence_count, 10)
      }));
    } catch (error) {
      logger.error(
        { function: fn, assignmentId, limit, error },
        'Failed to get error patterns'
      );
      return [];
    }
  }  

  private async updateTestCaseStatistics(
    assignmentId: number,
    testResults: TestResult[]
  ): Promise<void> {
    const fn = 'updateTestCaseStatistics';
    logger.debug(
      { function: fn, assignmentId, resultCount: testResults.length },
      'Starting test case statistics update'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId },
        'Mapping test results to test cases'
      );
  
      const testCaseMap = new Map<number, { passed: boolean; executionTime: number | undefined }[]>();
  
      for (const test of testResults) {
        if (test.testCaseId) {
          if (!testCaseMap.has(test.testCaseId)) {
            testCaseMap.set(test.testCaseId, []);
          }
          testCaseMap.get(test.testCaseId)!.push({
            passed: test.status === 'passed',
            executionTime: test.executionTime
          });
        }
      }
  
      logger.debug(
        {
          function: fn,
          assignmentId,
          uniqueTestCases: testCaseMap.size
        },
        'Finished mapping test results to test cases'
      );
  
      logger.debug(
        { function: fn, assignmentId },
        'Starting per–test case statistics update loop'
      );
  
      const snapshotTime = new Date().toISOString();
  
      for (const [testCaseId, results] of testCaseMap.entries()) {
        const totalRuns = results.length;
        const failures = results.filter(r => !r.passed).length;
        const failureRate = (failures / totalRuns) * 100;
  
        const validTimes = results.filter(
          r =>
            typeof r.executionTime === 'number' &&
            r.executionTime !== null &&
            r.executionTime >= 0
        );
        const avgRuntime =
          validTimes.length > 0
            ? validTimes.reduce((sum, r) => sum + (r.executionTime || 0), 0) /
              validTimes.length
            : null;
  
        logger.debug(
          {
            
            function: fn,
            assignmentId,
            testCaseId,
            totalRuns,
            failures,
            failureRate,
            avgRuntime
          },
          'Updating test case statistics row'
        );
  
        await pool.query(`
          INSERT INTO assignment_test_case_stats
            (assignment_id, test_case_id, snapshot_time, failure_rate, avg_runtime_ms)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, test_case_id, snapshot_time)
          DO UPDATE SET
            failure_rate = $4,
            avg_runtime_ms = $5
        `, [assignmentId, testCaseId, snapshotTime, failureRate, avgRuntime]);
  
        logger.debug(
          { function: fn, assignmentId, testCaseId },
          'Finished updating test case statistics row'
        );
      }
  
      logger.debug(
        { function: fn, assignmentId },
        'Completed test case statistics updates'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error updating test case statistics'
      );
      throw error;
    }
  }
  


  private async updateErrorPatterns(
    assignmentId: number,
    errorResults: TestResult[]
  ): Promise<void> {
    const fn = 'updateErrorPatterns';
    logger.debug(
      {
        
        function: fn,
        assignmentId,
        errorResultCount: errorResults.length
      },
      'Starting error pattern update'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId },
        'Grouping errors by type and message'
      );
  
      const errorMap = new Map<
        string,
        { count: number; errorType: string; errorMessage: string }
      >();
  
      for (const test of errorResults) {
        if (test.errorType || test.errorMessage) {
          const errorType = test.errorType || 'Unknown';
          const errorMessage = test.errorMessage || 'Unknown';
          const key = `${errorType}:${errorMessage}`;
  
          if (!errorMap.has(key)) {
            errorMap.set(key, { count: 0, errorType, errorMessage });
          }
  
          const entry = errorMap.get(key)!;
          entry.count++;
        }
      }
  
      logger.debug(
        {
          
          function: fn,
          assignmentId,
          uniquePatterns: errorMap.size
        },
        'Finished grouping error patterns'
      );
  
      const snapshotTime = new Date().toISOString();
      logger.debug(
        { function: fn, assignmentId, snapshotTime },
        'Updating error patterns in database'
      );
  
      for (const [, error] of errorMap.entries()) {
        await pool.query(`
          INSERT INTO assignment_error_patterns
            (assignment_id, snapshot_time, error_type, error_message, occurrence_count)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, snapshot_time, error_type, error_message)
          DO UPDATE SET occurrence_count = assignment_error_patterns.occurrence_count + $5
        `, [assignmentId, snapshotTime, error.errorType, error.errorMessage, error.count]);
      }
  
      logger.debug(
        { function: fn, assignmentId },
        'Completed error pattern updates'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error updating error patterns'
      );
      // note: original code swallowed the error; we keep that behavior
    }
  }
  

  private async updateSubmissionTimeline(assignmentId: number): Promise<void> {
    const fn = 'updateSubmissionTimeline';
    logger.debug(
      { function: fn, assignmentId },
      'Starting submission timeline update'
    );
  
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hourOfDay = now.getHours();
      const snapshotTime = now.toISOString();
  
      logger.debug(
        {
          
          function: fn,
          assignmentId,
          dayOfWeek,
          hourOfDay,
          snapshotTime
        },
        'Updating submission timeline in database'
      );
  
      await pool.query(`
        INSERT INTO assignment_submission_timeline
          (assignment_id, snapshot_time, submission_day, submission_hour, submission_count)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (assignment_id, snapshot_time, submission_day, submission_hour)
        DO UPDATE SET submission_count = assignment_submission_timeline.submission_count + 1
      `, [assignmentId, snapshotTime, dayOfWeek, hourOfDay]);
  
      logger.debug(
        { function: fn, assignmentId },
        'Completed updating submission timeline'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error updating submission timeline'
      );
    }
  }
  

  private async updateSubmissionTrend(assignmentId: number): Promise<void> {
    const fn = 'updateSubmissionTrend';
    logger.debug(
      { function: fn, assignmentId },
      'Starting submission trend update'
    );
  
    try {
      const today = new Date().toISOString().split('T')[0];
  
      logger.debug(
        { function: fn, assignmentId, date: today },
        'Updating submission trend in database'
      );
  
      await pool.query(`
        INSERT INTO assignment_submission_trend
          (assignment_id, snapshot_date, submission_count)
        VALUES ($1, $2, 1)
        ON CONFLICT (assignment_id, snapshot_date)
        DO UPDATE SET submission_count = assignment_submission_trend.submission_count + 1
      `, [assignmentId, today]);
  
      logger.debug(
        { function: fn, assignmentId },
        'Completed updating submission trend'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error updating submission trend'
      );
    }
  }
  

  private async updatePlagiarismStatistics(assignmentId: number): Promise<void> {
    const fn = 'updatePlagiarismStatistics';
    logger.debug(
      { function: fn, assignmentId },
      'Starting plagiarism statistics update'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId },
        'Querying plagiarism data from database'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId },
        'Processing plagiarism statistics'
      );
  
      const row = result.rows[0];
      const totalSubmissions = Number(row.total_submissions) || 0;
      const flaggedSubmissions = Number(row.flagged_submissions) || 0;
  
      const plagiarismRate =
        totalSubmissions > 0
          ? (flaggedSubmissions / totalSubmissions) * 100
          : null;
  
      const maxSimilarity = row.max_similarity;
      const avgSimilarity = row.avg_similarity;
  
      const snapshotTime = new Date().toISOString();
  
      logger.debug(
        {
          
          function: fn,
          assignmentId,
          plagiarismRate,
          maxSimilarity,
          avgSimilarity,
          snapshotTime
        },
        'Updating plagiarism statistics in assignment_statistics'
      );
  
      await pool.query(`
        UPDATE assignment_statistics
        SET 
          plagiarism_rate = $1,
          max_similarity = $2,
          avg_similarity = $3
        WHERE assignment_id = $4 AND snapshot_time::date = $5::date
      `, [plagiarismRate, maxSimilarity, avgSimilarity, assignmentId, snapshotTime]);
  
      logger.debug(
        { function: fn, assignmentId },
        'Completed updating plagiarism statistics'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error updating plagiarism statistics'
      );
    }
  }
  

  public async getAssignmentStatistics(
    assignmentId: number
  ): Promise<AssignmentStatistics | null> {
    const fn = 'getAssignmentStatistics';
    logger.info(
      { function: fn, assignmentId },
      'Fetching assignment statistics'
    );
  
    try {
      const today = new Date().toISOString().split('T')[0];
      logger.debug(
        { function: fn, assignmentId, date: today },
        'Checking for recent statistics snapshot'
      );
  
      const statsResult = await pool.query(`
        SELECT * FROM assignment_statistics
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY snapshot_time DESC
        LIMIT 1
      `, [assignmentId, today]);
  
      if (statsResult.rows.length > 0) {
        logger.debug(
          { function: fn, assignmentId },
          'Found recent statistics, building AssignmentStatistics DTO'
        );
  
        const stats = await this.buildAssignmentStatistics(
          assignmentId,
          statsResult.rows[0]
        );
  
        logger.info(
          { function: fn, assignmentId },
          'Returning cached assignment statistics'
        );
        return stats;
      }
  
      logger.debug(
        { function: fn, assignmentId },
        'No recent statistics found, recalculating all statistics'
      );
  
      const stats = await this.calculateAllStatistics(assignmentId);
  
      logger.info(
        { function: fn, assignmentId },
        'Returning freshly calculated assignment statistics'
      );
      return stats;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error getting assignment statistics'
      );
      return null;
    }
  }
  

  private async buildAssignmentStatistics(
    assignmentId: number,
    statsRow: any
  ): Promise<AssignmentStatistics> {
    const fn = 'buildAssignmentStatistics';
    logger.debug(
      {
        
        function: fn,
        assignmentId,
        snapshotTime: statsRow.snapshot_time?.toISOString?.()
      },
      'Building AssignmentStatistics object from snapshot row'
    );
  
    try {
      const snapshotDate = statsRow.snapshot_time.toISOString().split('T')[0];
  
      logger.debug(
        { function: fn, assignmentId, snapshotDate },
        'Fetching score distribution'
      );
  
      const scoreDistResult = await pool.query(`
        SELECT bucket_start, bucket_end, count
        FROM assignment_score_distribution
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY bucket_start
      `, [assignmentId, snapshotDate]);
  
      const scoreDistribution = scoreDistResult.rows.map(row => ({
        bucketStart: row.bucket_start,
        bucketEnd: row.bucket_end,
        count: row.count
      }));
  
      logger.debug(
        { function: fn, assignmentId, snapshotDate },
        'Fetching attempts distribution'
      );
  
      const attemptsResult = await pool.query(`
        SELECT avg_attempts, median_attempts, max_attempts
        FROM assignment_attempts_distribution
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY snapshot_time DESC
        LIMIT 1
      `, [assignmentId, snapshotDate]);
  
      const attemptsDistribution = attemptsResult.rows.length > 0
        ? {
            avgAttempts: attemptsResult.rows[0].avg_attempts,
            medianAttempts: attemptsResult.rows[0].median_attempts,
            maxAttempts: attemptsResult.rows[0].max_attempts
          }
        : {
            avgAttempts: 0,
            medianAttempts: 0,
            maxAttempts: 0
          };
  
      logger.debug(
        { function: fn, assignmentId, snapshotDate },
        'Fetching runtime distribution'
      );
  
      const runtimeResult = await pool.query(`
        SELECT min_runtime_ms, percentile_25_ms, median_runtime_ms, percentile_75_ms, max_runtime_ms
        FROM assignment_runtime_distribution
        WHERE assignment_id = $1 AND snapshot_time::date = $2::date
        ORDER BY snapshot_time DESC
        LIMIT 1
      `, [assignmentId, snapshotDate]);
  
      const runtimeDistribution = runtimeResult.rows.length > 0
        ? {
            minRuntimeMs: runtimeResult.rows[0].min_runtime_ms,
            percentile25Ms: runtimeResult.rows[0].percentile_25_ms,
            medianRuntimeMs: runtimeResult.rows[0].median_runtime_ms,
            percentile75Ms: runtimeResult.rows[0].percentile_75_ms,
            maxRuntimeMs: runtimeResult.rows[0].max_runtime_ms
          }
        : {
            minRuntimeMs: null,
            percentile25Ms: null,
            medianRuntimeMs: null,
            percentile75Ms: null,
            maxRuntimeMs: null
          };
  
      logger.debug(
        { function: fn, assignmentId },
        'Fetching secondary statistics components (timeline, trend, test cases, errors)'
      );
  
      const submissionTimeline = await this.getSubmissionTimeline(assignmentId);
      const submissionTrend = await this.getSubmissionTrend(assignmentId);
      const mostFrequentlyMissedTestCases =
        await this.getMostFrequentlyMissedTestCases(assignmentId);
      const topSlowestTestCases =
        await this.getTopSlowestTestCases(assignmentId);
      const commonErrorPatterns =
        await this.getCommonErrorPatterns(assignmentId);
  
      logger.debug(
        { function: fn, assignmentId },
        'Assembling AssignmentStatistics object'
      );
  
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
  
      logger.debug(
        { function: fn, assignmentId },
        'Completed building AssignmentStatistics object'
      );
  
      return stats;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error building assignment statistics'
      );
      throw error;
    }
  }
  

  public static getInstance(): AssignmentStatisticsService {
    const fn = 'getInstance';
    logger.debug(
      { function: fn },
      'Retrieving AssignmentStatisticsService singleton instance'
    );
  
    if (!AssignmentStatisticsService.instance) {
      logger.info(
        { function: fn },
        'Creating new AssignmentStatisticsService instance'
      );
      AssignmentStatisticsService.instance = new AssignmentStatisticsService();
    }
  
    logger.debug(
      { function: fn },
      'Returning AssignmentStatisticsService instance'
    );
  
    return AssignmentStatisticsService.instance;
  }
  

  private registerEventListeners(): void {
    const fn = 'registerEventListeners';
    logger.info(
      { function: fn },
      'Registering assignment statistics event listeners'
    );
    systemEventEmitter.on('SUBMISSION_CREATED', this.handleSubmissionCreated.bind(this));
    systemEventEmitter.on('SUBMISSION_COMPLETED', this.handleSubmissionCompleted.bind(this));
    systemEventEmitter.on('PLAGIARISM_DETECTED', this.handlePlagiarismDetected.bind(this));
    systemEventEmitter.on('GRADE_UPDATED', this.handleGradeUpdated.bind(this));
    logger.info(
      { function: fn },
      'Assignment statistics event listeners registered'
    );
  }

  private async handleSubmissionCreated(event: SubmissionCreatedEvent): Promise<void> {
    const { submissionId, assignmentId, studentId } = (event as SubmissionCreatedEvent).payload;
    const fn = 'handleSubmissionCreated';
    logger.debug(
      {
        function: fn,
        submissionId,
        assignmentId,
        studentId
      },
      'Handling SUBMISSION_CREATED event'
    );
    try {
      logger.debug(
        { function: fn, assignmentId },
        'Updating submission timeline and trend'
      );
      await this.updateSubmissionTimeline(assignmentId);
      await this.updateSubmissionTrend(assignmentId);
      
      logger.debug(
        { function: fn, assignmentId },
        'Recalculating basic statistics'
      );
      await this.calculateBasicStatistics(assignmentId);
      logger.debug(
        { function: fn, assignmentId },
        'Completed handling SUBMISSION_CREATED event'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          function: fn,
          assignmentId,
          submissionId,
          error,
          message: msg
        },
        'Error handling SUBMISSION_CREATED event'
      );
    }
  }

  private async handleSubmissionCompleted(
    event: SubmissionCompletedEvent
  ): Promise<void> {
    const fn = 'handleSubmissionCompleted';
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
    } = event.payload;
  
    logger.debug(
      {
        
        function: fn,
        submissionId,
        assignmentId,
        studentId,
        score,
        passedTests,
        totalTests,
        status
      },
      'Handling SUBMISSION_COMPLETED event'
    );
  
    if (assignmentId == null) {
      logger.error(
        {
          
          function: fn,
          submissionId,
          assignmentId
        },
        'Missing assignmentId in SUBMISSION_COMPLETED event payload'
      );
      return;
    }
  
    try {
      logger.debug(
        { function: fn, assignmentId },
        'Recalculating all statistics after submission completion'
      );
  
      await this.calculateAllStatistics(assignmentId);
  
      if (testResults && Array.isArray(testResults)) {
        logger.debug(
          {
            function: fn,
            assignmentId,
            submissionId,
            testResultCount: testResults.length
          },
          'Updating test case statistics from submission results'
        );
  
        await this.updateTestCaseStatistics(assignmentId, testResults);
      }
  
      const errorResults = testResults?.filter(
        t => t.status === 'error' || t.status === 'failed'
      );
  
      if (errorResults && errorResults.length > 0) {
        logger.debug(
          {
            function: fn,
            assignmentId,
            submissionId,
            errorResultCount: errorResults.length
          },
          'Updating error patterns from failing test results'
        );
  
        await this.updateErrorPatterns(assignmentId, errorResults);
      }
  
      logger.debug(
        { function: fn, assignmentId, submissionId },
        'Completed handling SUBMISSION_COMPLETED event'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          function: fn,
          assignmentId,
          submissionId,
          error,
          message: msg
        },
        'Error handling SUBMISSION_COMPLETED event'
      );
    }
  }
  

  private async handlePlagiarismDetected(
    event: PlagiarismDetectedEvent
  ): Promise<void> {
    const fn = 'handlePlagiarismDetected';
    const {
      submissionId,
      assignmentId,
      studentId,
      comparedSubmissionId,
      similarityScore
    } = event.payload;
  
    logger.debug(
      {
        function: fn,
        submissionId,
        assignmentId,
        studentId,
        comparedSubmissionId,
        similarityScore
      },
      'Handling PLAGIARISM_DETECTED event'
    );
  
    try {
      await this.updatePlagiarismStatistics(assignmentId);
  
      logger.debug(
        { function: fn, assignmentId, submissionId },
        'Completed handling PLAGIARISM_DETECTED event'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          function: fn,
          assignmentId,
          submissionId,
          error,
          message: msg
        },
        'Error handling PLAGIARISM_DETECTED event'
      );
    }
  }
  

  private async calculateBasicStatistics(assignmentId: number): Promise<void> {
    const fn = 'calculateBasicStatistics';
    logger.debug(
      { function: fn, assignmentId },
      'Starting basic statistics calculation'
    );
  
    try {
      try {
        await pool.query('BEGIN');
        logger.debug(
          { function: fn, assignmentId },
          'Transaction started'
        );
  
        logger.debug(
          { function: fn, assignmentId },
          'Querying total submissions and distinct submitters'
        );
  
        const totalSubmissionsResult = await pool.query(
          'SELECT COUNT(*) as total FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const totalSubmissions = parseInt(
          totalSubmissionsResult.rows[0].total,
          10
        );
  
        const distinctSubmittersResult = await pool.query(
          'SELECT COUNT(DISTINCT student_id) as distinct_count FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const distinctSubmitters = parseInt(
          distinctSubmittersResult.rows[0].distinct_count,
          10
        );
  
        const snapshotTime = new Date().toISOString();
  
        logger.debug(
          {
            function: fn,
            assignmentId,
            snapshotTime,
            totalSubmissions,
            distinctSubmitters
          },
          'Updating basic statistics in database'
        );
  
        await pool.query(
          `
          INSERT INTO assignment_statistics 
            (assignment_id, snapshot_time, total_submissions, distinct_submitters)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (assignment_id, snapshot_time) 
          DO UPDATE SET 
            total_submissions = $3,
            distinct_submitters = $4
        `,
          [assignmentId, snapshotTime, totalSubmissions, distinctSubmitters]
        );
  
        await pool.query('COMMIT');
        logger.debug(
          { function: fn, assignmentId },
          'Transaction committed for basic statistics'
        );
      } catch (error) {
        await pool.query('ROLLBACK');
        logger.error(
          { function: fn, assignmentId, error },
          'Transaction rolled back while calculating basic statistics'
        );
        throw error;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error calculating basic statistics'
      );
    }
  
    logger.debug(
      { function: fn, assignmentId },
      'Completed calculateBasicStatistics'
    );
  }
  

  // Updated calculateAllStatistics function with extracted score statistics
public async calculateAllStatistics(assignmentId: number): Promise<AssignmentStatistics | null> {
    const fn = 'calculateAllStatistics';
    logger.info(
      { function: fn, assignmentId },
      'Calculating all statistics for assignment'
    );
    
    try {
      try {
        await pool.query('BEGIN');
        logger.debug(
          { function: fn, assignmentId },
          'Transaction started'
        );
        
        const snapshotTime = new Date().toISOString();
        logger.debug(
          { function: fn, assignmentId, snapshotTime },
          'Snapshot timestamp selected'
        );
        
        // Basic statistics
        const totalSubmissionsResult = await pool.query(
          'SELECT COUNT(*) as total FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const totalSubmissions = parseInt(totalSubmissionsResult.rows[0].total, 10);
        logger.debug(
          { function: fn, assignmentId, totalSubmissions },
          'Computed total submissions'
        );
        
        
        const distinctSubmittersResult = await pool.query(
          'SELECT COUNT(DISTINCT student_id) as distinct_count FROM submissions WHERE assignment_id = $1',
          [assignmentId]
        );
        const distinctSubmitters = parseInt(distinctSubmittersResult.rows[0].distinct_count, 10);
        logger.debug(
          { function: fn, assignmentId, distinctSubmitters },
          'Computed distinct submitters'
        );
        
        // Score statistics are now handled in a separate function
        const scoreStatsResult = await pool.query(`
          SELECT 
            COALESCE(AVG(final_score), 0) as average_score,
            COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_score), 0) as median_score
          FROM submissions 
          WHERE assignment_id = $1 AND final_score IS NOT NULL
        `, [assignmentId]);
        
        const averageScore = scoreStatsResult.rows[0].average_score;
        const medianScore = scoreStatsResult.rows[0].median_score;
        
        // Score distribution
        const scoreDistribution: ScoreDistributionBucket[] = [];
        for (const bucket of SCORE_BUCKETS) {
          const bucketResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM submissions
            WHERE assignment_id = $1 AND final_score IS NOT NULL 
              AND final_score >= $2 AND final_score <= $3
          `, [assignmentId, bucket.start, bucket.end]);
          
          const count = parseInt(bucketResult.rows[0].count, 10);
          scoreDistribution.push({
            bucketStart: bucket.start,
            bucketEnd: bucket.end,
            count
          });
          
          await pool.query(`
            INSERT INTO assignment_score_distribution
              (assignment_id, snapshot_time, bucket_start, bucket_end, count)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (assignment_id, snapshot_time, bucket_start)
            DO UPDATE SET count = $5
          `, [assignmentId, snapshotTime, bucket.start, bucket.end, count]);
        }
        
        // Attempts distribution
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
        logger.debug(
          {
            function: fn,
            assignmentId,
            avgAttempts: attemptsDistribution.avgAttempts,
            medianAttempts: attemptsDistribution.medianAttempts,
            maxAttempts: attemptsDistribution.maxAttempts
          },
          'Computed attempts distribution'
        );
        
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
        
        // Runtime statistics
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
        
        const raw = runtimeResult.rows[0]
        const averageRuntimeMs = Math.round(Number(raw.average_runtime));
        const runtimeDistribution: RuntimeDistribution = {
          minRuntimeMs:    Math.round(Number(raw.min_runtime)),
          percentile25Ms:  Math.round(Number(raw.p25_runtime)),
          medianRuntimeMs: Math.round(Number(raw.median_runtime)),
          percentile75Ms:  Math.round(Number(raw.p75_runtime)),
          maxRuntimeMs:    Math.round(Number(raw.max_runtime)),
        };
        
        logger.debug(
          {
            function: fn,
            assignmentId,
            averageRuntimeMs,
            minRuntimeMs: runtimeDistribution.minRuntimeMs,
            maxRuntimeMs: runtimeDistribution.maxRuntimeMs
          },
          'Computed runtime statistics'
        );
        
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
        
        // Test pass rates
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
        logger.debug(
          {
            function: fn,
            assignmentId,
            publicTestPassRate,
            privateTestPassRate
          },
          'Computed test pass rates'
        );
        
        
        // Plagiarism statistics
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
        logger.debug(
          {
            function: fn,
            assignmentId,
            plagiarismRate,
            maxSimilarity,
            avgSimilarity
          },
          'Computed plagiarism statistics'
        );
        
        // Runtime error rate
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
          logger.debug(
            {
              function: fn,
              assignmentId,
              runtimeErrorRate
            },
            'Computed runtime error rate'
          );
        
        // Update main statistics
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
        
        logger.debug(
          { function: fn, assignmentId },
          'Transaction committed'
        );
        
        // Construct full statistics object
        logger.debug(
          { function: fn, assignmentId },
          'Constructing full statistics object'
        );
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
        
        logger.info(
          { function: fn, assignmentId },
          'Completed calculating all statistics'
        );
        return stats;
      } catch (error) {
        await pool.query('ROLLBACK');
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(
          { function: fn, assignmentId, error },
          `Error calculating statistics: ${msg}`
        );
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      logger.error(
        { function: fn, assignmentId, errorMessage, errorStack },
        'Statistics calculation failed'
      );
      throw new Error(`Statistics calculation failed: ${errorMessage}`);
    }
  }

  private async handleGradeUpdated(
    event: GradeUpdatedEvent
  ): Promise<void> {
    const fn = 'handleGradeUpdated';
    const { assignmentId, submissionId, finalScore } = event.payload;
  
    logger.info(
      { function: fn, assignmentId, submissionId, finalScore },
      'Received GRADE_UPDATED event'
    );
  
    try {
      await this.updateScoreStatistics(assignmentId);
      logger.info(
        { function: fn, assignmentId },
        'Score statistics updated for assignment'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        { function: fn, assignmentId, submissionId, error: err, message: msg },
        'Error in handleGradeUpdated'
      );
    }
  }

  private async updateScoreStatistics(assignmentId: number): Promise<void> {
    const fn = 'updateScoreStatistics';
    logger.debug(
      { function: fn, assignmentId },
      'Starting score statistics update'
    );
  
    try {
      logger.debug(
        { function: fn, assignmentId },
        'Querying score statistics from submissions'
      );
  
      const scoreStatsResult = await pool.query(`
        SELECT 
          COALESCE(AVG(final_score), 0) as average_score,
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_score), 0) as median_score
        FROM submissions 
        WHERE assignment_id = $1 AND final_score IS NOT NULL
      `, [assignmentId]);
  
      const averageScore = scoreStatsResult.rows[0].average_score;
      const medianScore = scoreStatsResult.rows[0].median_score;
  
      logger.debug(
        {
          function: fn,
          assignmentId,
          averageScore,
          medianScore
        },
        'Computed basic score statistics'
      );
  
      const snapshotTime = new Date().toISOString();
  
      const scoreDistribution: ScoreDistributionBucket[] = [];
      logger.debug(
        { function: fn, assignmentId, snapshotTime },
        'Calculating score distribution buckets'
      );
  
      for (const bucket of SCORE_BUCKETS) {
        logger.debug(
          {
            function: fn,
            assignmentId,
            bucketStart: bucket.start,
            bucketEnd: bucket.end
          },
          'Querying bucket count'
        );
  
        const bucketResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM submissions
          WHERE assignment_id = $1 AND final_score IS NOT NULL 
            AND final_score >= $2 AND final_score <= $3
        `, [assignmentId, bucket.start, bucket.end]);
  
        const count = parseInt(bucketResult.rows[0].count, 10);
  
        scoreDistribution.push({
          bucketStart: bucket.start,
          bucketEnd: bucket.end,
          count
        });
  
        logger.debug(
          {
            function: fn,
            assignmentId,
            bucketStart: bucket.start,
            bucketEnd: bucket.end,
            count
          },
          'Saving score distribution bucket to database'
        );
  
        await pool.query(`
          INSERT INTO assignment_score_distribution
            (assignment_id, snapshot_time, bucket_start, bucket_end, count)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (assignment_id, snapshot_time, bucket_start)
          DO UPDATE SET count = $5
        `, [assignmentId, snapshotTime, bucket.start, bucket.end, count]);
      }
  
      logger.debug(
        {
          function: fn,
          assignmentId,
          bucketCount: scoreDistribution.length
        },
        'Score distribution calculated and saved'
      );
  
      logger.debug(
        { function: fn, assignmentId },
        'Updating assignment_statistics with new average and median scores'
      );
  
      await pool.query(`
        UPDATE assignment_statistics
        SET 
          average_score = $1,
          median_score = $2
        WHERE assignment_id = $3 AND snapshot_time::date = $4::date
      `, [averageScore, medianScore, assignmentId, snapshotTime.split('T')[0]]);
  
      logger.info(
        {
          function: fn,
          assignmentId,
          averageScore,
          medianScore
        },
        'Completed score statistics update'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { function: fn, assignmentId, error, message: msg },
        'Error updating score statistics'
      );
      throw error;
    }
  
    logger.debug(
      { function: fn, assignmentId },
      'Finished updateScoreStatistics'
    );
  }  
}

