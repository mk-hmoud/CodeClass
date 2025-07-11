import pool from "../config/db";
import { AssignmentAnalyticsPayload, ClassroomAnalyticsPayload } from "../types/";

const logMessage = (fn: string, msg: string) => {
  console.log(`[${new Date().toISOString()}] [analyticsModel] [${fn}] ${msg}`);
};

export async function getClassroomAnalytics(classroomId: number): Promise<ClassroomAnalyticsPayload> {
  const fn = "getClassroomAnalytics";

  const classroomRes = await pool.query(
    'SELECT classroom_name FROM classrooms WHERE classroom_id = $1',[classroomId]
  );
  const classroomName = classroomRes.rows[0].classroom_name;
  logMessage(fn, `Classroom name : ${classroomName}`);

  const statRes = await pool.query(
    `SELECT
       total_students,
       active_students,
       active_student_rate,
       submissions_per_student,
       avg_assignment_score,
       median_assignment_score,
       plagiarism_rate,
       avg_similarity,
       max_similarity,
       runtime_error_rate,
       assignment_completion_rate,
       dropoff_rate,
       snapshot_time
     FROM classroom_statistics
     WHERE classroom_id = $1
     ORDER BY snapshot_time DESC
     LIMIT 1`,
    [classroomId]
  );
  if (statRes.rowCount === 0) {
    logMessage(fn, `No statistics found for classroom ${classroomId}, returning zeros.`);
  }
  const stats = statRes.rows[0] ?? {
    total_students: 0,
    active_students: 0,
    active_student_rate: 0,
    submissions_per_student: 0,
    avg_assignment_score: 0,
    median_assignment_score: 0,
    plagiarism_rate: 0,
    avg_similarity: 0,
    max_similarity: 0,
    runtime_error_rate: 0,
    assignment_completion_rate: 0,
    dropoff_rate: 0,
    snapshot_time: new Date().toISOString(),
  };

  const distRes = await pool.query(
    `SELECT bucket_start, bucket_end, count
     FROM classroom_score_distribution
     WHERE classroom_id = $1 AND snapshot_time::date = CURRENT_DATE
     ORDER BY bucket_start`,
    [classroomId]
  );
  const scoreDistribution = distRes.rows.map(r => ({
    range: `${r.bucket_start}–${r.bucket_end}`,
    count: r.count,
  }));

  const heatRes = await pool.query(
    `SELECT submission_day, submission_hour, submission_count
     FROM classroom_submission_timeline
     WHERE classroom_id = $1 AND snapshot_time::date = CURRENT_DATE`,
    [classroomId]
  );
  const heatmap = heatRes.rows.map(r => ({
    day: r.submission_day,
    hour: r.submission_hour,
    count: r.submission_count,
  }));

  const langRes = await pool.query(
    `SELECT language_id, submission_count
     FROM classroom_language_usage
     WHERE classroom_id = $1 AND snapshot_time::date = CURRENT_DATE`,
    [classroomId]
  );
  const languageUsage = langRes.rows.map(r => ({
    languageId: r.language_id,
    count: r.submission_count,
  }));

  const impRes = await pool.query(
    `SELECT improved_significantly, improved_moderately, stayed_flat, declined
     FROM classroom_student_improvement
     WHERE classroom_id = $1 AND snapshot_time::date = CURRENT_DATE`,
    [classroomId]
  );
  const impRow = impRes.rows[0] ?? {
    improved_significantly: 0,
    improved_moderately: 0,
    stayed_flat: 0,
    declined: 0,
  };
  const improvementDistribution = [
    { range: "significant" as const, count: impRow.improved_significantly },
    { range: "moderate"   as const, count: impRow.improved_moderately   },
    { range: "flat"       as const, count: impRow.stayed_flat           },
    { range: "declined"   as const, count: impRow.declined             },
  ];

  const scoreTrend: Array<{ period: string; averageScore: number }> = [];

  return {
    classroomName,
    classroomId,
    snapshotTime: stats.snapshot_time,
    participation: {
      totalStudents: stats.total_students,
      activeStudents: stats.active_students,
      activeStudentsPercentage: parseFloat(stats.active_student_rate),
      submissionRate: parseFloat(stats.submissions_per_student),
      submissionTrend: heatmap,
    },
    performance: {
      averageAssignmentScore: parseFloat(stats.avg_assignment_score),
      medianAssignmentScore: parseFloat(stats.median_assignment_score),
      scoreDistribution,
      scoreTrend,
    },
    timings: {
      heatmap,
    },
    quality: {
      plagiarismRate: parseFloat(stats.plagiarism_rate),
      averageSimilarity: parseFloat(stats.avg_similarity),
      maxSimilarity: parseFloat(stats.max_similarity),
      runtimeErrorRate: parseFloat(stats.runtime_error_rate),
      languageUsage,
    },
    progress: {
      assignmentCompletionRate: parseFloat(stats.assignment_completion_rate),
      dropOffRate: parseFloat(stats.dropoff_rate),
      improvementDistribution,
    },
  };
}

export async function getAssignmentAnalytics(assignmentId: number): Promise<AssignmentAnalyticsPayload> {
  const fn = "getAssignmentAnalytics";
  logMessage(fn, `Fetching analytics for assignment ${assignmentId}`);

  try {

    const assignmentRes = await pool.query(
      `SELECT title, due_date, points 
       FROM assignments 
       WHERE assignment_id = $1`,
      [assignmentId]
    );
    const assignmentRow = assignmentRes.rows[0] || {};
    const statsRes = await pool.query(
      `SELECT 
        total_submissions,
        distinct_submitters,
        average_score,
        median_score,
        average_runtime_ms,
        public_test_pass_rate,
        private_test_pass_rate,
        plagiarism_rate,
        max_similarity,
        avg_similarity,
        runtime_error_rate
      FROM assignment_statistics 
      WHERE assignment_id = $1 
      ORDER BY snapshot_time DESC 
      LIMIT 1`,
      [assignmentId]
    );

    if (statsRes.rowCount === 0) {
      logMessage(fn, `No statistics found for assignment ${assignmentId}, returning default values`);
      return getDefaultAnalyticsPayload();
    }

    const basicStats = statsRes.rows[0];

    const scoreDistRes = await pool.query(
      `SELECT 
        bucket_start,
        bucket_end,
        count
      FROM assignment_score_distribution 
      WHERE assignment_id = $1 
      ORDER BY snapshot_time DESC, bucket_start ASC`,
      [assignmentId]
    );

    const attemptsRes = await pool.query(
      `SELECT 
        avg_attempts,
        median_attempts,
        max_attempts
      FROM assignment_attempts_distribution 
      WHERE assignment_id = $1 
      ORDER BY snapshot_time DESC 
      LIMIT 1`,
      [assignmentId]
    );

    const runtimeRes = await pool.query(
      `SELECT 
        min_runtime_ms,
        percentile_25_ms,
        median_runtime_ms,
        percentile_75_ms,
        max_runtime_ms
      FROM assignment_runtime_distribution 
      WHERE assignment_id = $1 
      ORDER BY snapshot_time DESC 
      LIMIT 1`,
      [assignmentId]
    );

    const timelineRes = await pool.query(
      `SELECT 
        submission_day,
        submission_hour,
        submission_count
      FROM assignment_submission_timeline 
      WHERE assignment_id = $1 
      ORDER BY snapshot_time DESC, submission_day ASC, submission_hour ASC`,
      [assignmentId]
    );

    const errorRes = await pool.query(
      `SELECT 
        error_type,
        SUM(occurrence_count) as count
      FROM assignment_error_patterns 
      WHERE assignment_id = $1 
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10`,
      [assignmentId]
    );

    const missedTestsRes = await pool.query(
      `SELECT 
        pt.test_case_id as id,
        COALESCE(pt.input, 'Test case ' || pt.test_case_id) as description,
        ats.failure_rate,
        ats.avg_runtime_ms
      FROM assignment_test_case_stats ats
      JOIN problem_test_cases pt ON ats.test_case_id = pt.test_case_id
      WHERE ats.assignment_id = $1
      ORDER BY ats.failure_rate DESC, ats.avg_runtime_ms DESC
      LIMIT 10`,
      [assignmentId]
    );

    const trendRes = await pool.query(
      `SELECT 
        snapshot_date as date,
        submission_count as count
      FROM assignment_submission_trend 
      WHERE assignment_id = $1 
      ORDER BY snapshot_date ASC`,
      [assignmentId]
    );

    const runtimeErrorCount = Math.round(basicStats.total_submissions * basicStats.runtime_error_rate / 100);

    const scoreDistribution = scoreDistRes.rows.map(row => {
      return {
        range: `${row.bucket_start}-${row.bucket_end}`,
        count: row.count,
        color: getScoreColor(row.bucket_start)
      };
    });

    const submissionTimeline = timelineRes.rows.map(row => {
      return {
        day: getDayName(row.submission_day),
        hour: row.submission_hour.toString(),
        value: row.submission_count
      };
    });

    const mostMissedTests = missedTestsRes.rows.map(row => {
      return {
        id: row.id.toString(),
        description: row.description,
        failRate: row.failure_rate
      };
    });

    const slowestTestCases = missedTestsRes.rows
      .sort((a, b) => b.avg_runtime_ms - a.avg_runtime_ms)
      .slice(0, 5)
      .map(row => {
        return {
          id: row.id.toString(),
          description: row.description,
          avgRuntime: row.avg_runtime_ms
        };
      });

    const runtimeErrorTypes = errorRes.rows.map(row => {
      return {
        type: row.error_type,
        count: row.occurrence_count
      };
    });

    const submissionTrend = trendRes.rows.map(row => {
      return {
        date: formatDate(row.date),
        count: row.count
      };
    });

    const analyticsPayload: AssignmentAnalyticsPayload = {
      totalSubmissions: basicStats.total_submissions || 0,
      distinctSubmitters: basicStats.distinct_submitters || 0,
      averageScore: basicStats.average_score || 0,
      medianScore: basicStats.median_score || 0,
      scoreDistribution,
      attemptsPerStudent: {
        average: attemptsRes.rows[0]?.avg_attempts || 0,
        median: attemptsRes.rows[0]?.median_attempts || 0,
        max: attemptsRes.rows[0]?.max_attempts || 0,
        distribution: formatAttemptsDistribution(attemptsRes.rows[0])
      },
      submissionTimeline,
      averageRuntime: basicStats.average_runtime_ms || 0,
      runtimeDistribution: {
        min: runtimeRes.rows[0]?.min_runtime_ms || 0,
        q1: runtimeRes.rows[0]?.percentile_25_ms || 0,
        median: runtimeRes.rows[0]?.median_runtime_ms || 0,
        q3: runtimeRes.rows[0]?.percentile_75_ms || 0,
        max: runtimeRes.rows[0]?.max_runtime_ms || 0
      },
      testPassRates: {
        public: basicStats.public_test_pass_rate || 0,
        private: basicStats.private_test_pass_rate || 0
      },
      mostMissedTests,
      commonErrorPatterns: runtimeErrorTypes,
      plagiarism: {
        rate: basicStats.plagiarism_rate || 0,
        maxSimilarity: basicStats.max_similarity || 0,
        averageSimilarity: basicStats.avg_similarity || 0
      },
      runtimeErrors: {
        count: runtimeErrorCount,
        percentage: basicStats.runtime_error_rate || 0,
        types: runtimeErrorTypes
      },
      slowestTestCases,
      submissionTrend,

      assignmentTitle: assignmentRow.title,
      dueDate: assignmentRow.due_date ? new Date(assignmentRow.due_date) : undefined,
      points: assignmentRow.points ?? undefined,
    };

    logMessage(fn, `Successfully fetched and processed analytics for assignment ${assignmentId}`);
    return analyticsPayload;
  } catch (error) {
    logMessage(fn, `Error fetching analytics for assignment ${assignmentId}: ${error}`);
    throw error;
  }
}

function getDefaultAnalyticsPayload(): AssignmentAnalyticsPayload {
  return {
    totalSubmissions: 0,
    distinctSubmitters: 0,
    averageScore: 0,
    medianScore: 0,
    scoreDistribution: [],
    attemptsPerStudent: {
      average: 0,
      median: 0,
      max: 0,
      distribution: []
    },
    submissionTimeline: [],
    averageRuntime: 0,
    runtimeDistribution: {
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0
    },
    testPassRates: {
      public: 0,
      private: 0
    },
    mostMissedTests: [],
    commonErrorPatterns: [],
    plagiarism: {
      rate: 0,
      maxSimilarity: 0,
      averageSimilarity: 0
    },
    runtimeErrors: {
      count: 0,
      percentage: 0,
      types: []
    },
    slowestTestCases: [],
    submissionTrend: []
  };
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#4CAF50'; // Green
  if (score >= 80) return '#8BC34A'; // Light Green
  if (score >= 70) return '#CDDC39'; // Lime
  if (score >= 60) return '#FFEB3B'; // Yellow
  if (score >= 50) return '#FFC107'; // Amber
  return '#F44336';
}

function getDayName(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day % 7];
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function formatAttemptsDistribution(attempts: any): Array<{ attempts: string; count: number }> {
  if (!attempts) return [];
  
  const median = attempts.median_attempts || 0;
  const max = attempts.max_attempts || 0;
  
  return [
    { attempts: '1', count: Math.round(max * 0.4) },
    { attempts: '2-3', count: Math.round(max * 0.3) },
    { attempts: '4-5', count: Math.round(max * 0.2) },
    { attempts: '6+', count: Math.round(max * 0.1) }
  ];
}