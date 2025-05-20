import pool from '../../../config/db';
import { systemEventEmitter } from '../emitter';
import { 
  EventPayload, 
  EventType, 
  SubmissionCreatedEvent,
  SubmissionCompletedEvent,
  PlagiarismDetectedEvent,
  StudentEnrolledEvent
} from '../events';
import { TestResult } from '../../../types';

const logMessage = (functionName: string, message: string): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [ClassroomStatisticsService.ts] [${functionName}] ${message}`);
};

export class ClassroomStatisticsService {
  private static instance: ClassroomStatisticsService;
  
  private constructor() {
    this.registerEventHandlers();
  }

  public static getInstance(): ClassroomStatisticsService {
    if (!ClassroomStatisticsService.instance) {
      ClassroomStatisticsService.instance = new ClassroomStatisticsService();
    }
    return ClassroomStatisticsService.instance;
  }

  private registerEventHandlers(): void {
    logMessage('registerEventHandlers', 'Initializing event handlers');
  
    systemEventEmitter.on('SUBMISSION_CREATED', (event: SubmissionCreatedEvent) => {
      logMessage('eventHandler', `Received SUBMISSION_CREATED event for assignment ${event.payload.assignmentId}`);
      this.handleSubmissionCreated(event);
    });
    
    systemEventEmitter.on('SUBMISSION_COMPLETED', (event: SubmissionCompletedEvent) => {
      logMessage('eventHandler', `Received SUBMISSION_COMPLETED event for submission ${event.payload.submissionId}`);
      this.handleSubmissionCompleted(event);
    });
  
    systemEventEmitter.on('STUDENT_ENROLLED', (event: StudentEnrolledEvent) => {
      logMessage('eventHandler', `Received STUDENT_ENROLLED event for student ${event.payload.studentId}`);
      this.handleStudentEnrolled(event);
    });
  
    systemEventEmitter.on('PLAGIARISM_DETECTED', (event: PlagiarismDetectedEvent) => {
      logMessage('eventHandler', `Received PLAGIARISM_DETECTED event with similarity ${event.payload.similarityScore}`);
      this.handlePlagiarismDetected(event);
    });
  
    logMessage('registerEventHandlers', 'Event handlers registered successfully');
  }


  private async handleSubmissionCreated(event: SubmissionCreatedEvent): Promise<void> {
    const fn = 'handleSubmissionCreated';
    try {
      logMessage(fn, `Processing submission created event: ${JSON.stringify(event.payload)}`);
      
      const { assignmentId, classroomId } = event.payload;
      logMessage(fn, `Resolving classroom for assignment ${assignmentId}`);
      
      const targetClassroomId = classroomId || await this.getClassroomIdForAssignment(assignmentId);
      if (!targetClassroomId) {
        logMessage(fn, `Aborting processing - no classroom found for assignment ${assignmentId}`);
        return;
      }

      logMessage(fn, `Updating timeline for classroom ${targetClassroomId}`);
      await this.updateSubmissionTimeline(targetClassroomId);
      
      logMessage(fn, `Incrementing submissions for classroom ${targetClassroomId}`);
      await this.incrementTotalSubmissions(targetClassroomId);
      
      logMessage(fn, `Submission created processing completed for classroom ${targetClassroomId}`);
    } catch (error) {
      logMessage(fn, `Error processing event: ${error}\nEvent: ${JSON.stringify(event)}`);
    }
  }

  private async handleSubmissionCompleted(event: SubmissionCompletedEvent): Promise<void> {
    const fn = 'handleSubmissionCompleted';
    try {
      logMessage(fn, `Processing submission completed event: ${JSON.stringify(event.payload)}`);
      
      const { assignmentId, classroomId: eventClassroomId, submissionId, studentId } = event.payload;
      const classroomId = eventClassroomId || await this.getClassroomIdForAssignment(assignmentId);
      
      if (!classroomId) {
        logMessage(fn, `Aborting processing - no classroom found for assignment ${assignmentId}`);
        return;
      }

      logMessage(fn, `Resolved classroom ${classroomId} for submission ${submissionId}`);
      
      const languageId = await this.getLanguageIdForSubmission(submissionId);
      logMessage(fn, `Detected language ${languageId} for submission ${submissionId}`);

      logMessage(fn, `Updating classroom stats for ${classroomId}`);
      await this.updateClassroomStats(classroomId);

      if (event.payload.score !== null) {
        logMessage(fn, `Updating score distribution with score ${event.payload.score}`);
        await this.updateScoreDistribution(classroomId, event.payload.score);
      }

      if (languageId) {
        logMessage(fn, `Recording language usage for language ${languageId}`);
        await this.updateLanguageUsage(classroomId, languageId);
      }

      logMessage(fn, `Submission ${submissionId} processing completed successfully`);
    } catch (error) {
      logMessage(fn, `Error processing submission: ${error}\n${JSON.stringify(event.payload)}`);
    }
  }

  private async handleStudentEnrolled(event: StudentEnrolledEvent): Promise<void> {
    const fn = 'handleStudentEnrolled';
    try {
      logMessage(fn, `Processing enrollment event: ${JSON.stringify(event.payload)}`);
      
      const { classroomId } = event.payload;
      logMessage(fn, `Updating total students for classroom ${classroomId}`);
      
      await this.updateTotalStudents(classroomId);
      logMessage(fn, `Student enrollment processed successfully for classroom ${classroomId}`);
    } catch (error) {
      logMessage(fn, `Error processing enrollment: ${error}\n${JSON.stringify(event.payload)}`);
    }
  }

  private async handlePlagiarismDetected(event: PlagiarismDetectedEvent): Promise<void> {
    const fn = 'handlePlagiarismDetected';
    try {
      logMessage(fn, `Processing plagiarism event: ${JSON.stringify(event.payload)}`);
      
      const { similarityScore, assignmentId, classroomId: eventClassroomId } = event.payload;
      const classroomId = eventClassroomId || await this.getClassroomIdForAssignment(assignmentId);
      
      if (!classroomId) {
        logMessage(fn, `Aborting processing - no classroom found for assignment ${assignmentId}`);
        return;
      }

      logMessage(fn, `Updating plagiarism stats with similarity ${similarityScore}%`);
      await this.updatePlagiarismStats(classroomId, similarityScore);
      
      logMessage(fn, `Plagiarism processing completed for classroom ${classroomId}`);
    } catch (error) {
      logMessage(fn, `Error processing plagiarism: ${error}\n${JSON.stringify(event.payload)}`);
    }
  }


  private async getClassroomIdForAssignment(assignmentId: number): Promise<number | null> {
    try {
      const result = await pool.query(
        'SELECT classroom_id FROM assignments WHERE assignment_id = $1',
        [assignmentId]
      );
      return result.rows[0]?.classroom_id || null;
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error fetching classroom ID for assignment: ${error}`);
      return null;
    }
  }

  private async getLanguageIdForSubmission(submissionId: number): Promise<number | null> {
    try {
      const result = await pool.query(
        'SELECT language_id FROM submissions WHERE submission_id = $1',
        [submissionId]
      );
      return result.rows[0]?.language_id || null;
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error fetching language ID for submission: ${error}`);
      return null;
    }
  }

  private async updateSubmissionTimeline(classroomId: number): Promise<void> {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); 
      const hour = now.getHours();
      
      const existingRecord = await pool.query(
        `SELECT * FROM classroom_submission_timeline 
         WHERE classroom_id = $1 
         AND submission_day = $2 
         AND submission_hour = $3
         AND snapshot_time::date = CURRENT_DATE`,
        [classroomId, dayOfWeek, hour]
      );
      
      if (existingRecord.rows.length > 0) {
        await pool.query(
          `UPDATE classroom_submission_timeline 
           SET submission_count = submission_count + 1
           WHERE timeline_id = $1`,
          [existingRecord.rows[0].timeline_id]
        );
      } else {
        await pool.query(
          `INSERT INTO classroom_submission_timeline 
           (classroom_id, submission_day, submission_hour, submission_count)
           VALUES ($1, $2, $3, 1)`,
          [classroomId, dayOfWeek, hour]
        );
      }
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error updating submission timeline: ${error}`);
    }
  }

  private async incrementTotalSubmissions(classroomId: number): Promise<void> {
    try {
      const existingRecord = await pool.query(
        `SELECT * FROM classroom_statistics 
         WHERE classroom_id = $1 
         AND snapshot_time::date = CURRENT_DATE`,
        [classroomId]
      );
      
      if (existingRecord.rows.length > 0) {
        await pool.query(
          `UPDATE classroom_statistics 
           SET total_submissions = total_submissions + 1,
               submissions_per_student = 
                 CASE WHEN total_students > 0 
                   THEN (total_submissions + 1)::numeric / total_students::numeric 
                   ELSE 0 
                 END
           WHERE stat_id = $1`,
          [existingRecord.rows[0].stat_id]
        );
      } else {
        const studentCount = await this.getTotalStudentsCount(classroomId);
        
        await pool.query(
          `INSERT INTO classroom_statistics 
           (classroom_id, total_students, total_submissions, submissions_per_student)
           VALUES ($1, $2, 1, $3)`,
          [classroomId, studentCount, studentCount > 0 ? 1.0 / studentCount : 0]
        );
      }
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error incrementing total submissions: ${error}`);
    }
  }

  private async updateScoreDistribution(classroomId: number, score: number): Promise<void> {
    try {
      const bucketStart = Math.floor(score / 10) * 10;
      const bucketEnd = bucketStart + 10;
      
      const existingRecord = await pool.query(
        `SELECT * FROM classroom_score_distribution 
         WHERE classroom_id = $1 
         AND bucket_start = $2
         AND snapshot_time::date = CURRENT_DATE`,
        [classroomId, bucketStart]
      );
      
      if (existingRecord.rows.length > 0) {
        await pool.query(
          `UPDATE classroom_score_distribution 
           SET count = count + 1
           WHERE distribution_id = $1`,
          [existingRecord.rows[0].distribution_id]
        );
      } else {
        await pool.query(
          `INSERT INTO classroom_score_distribution 
           (classroom_id, snapshot_time, bucket_start, bucket_end, count)
           VALUES ($1, CURRENT_TIMESTAMP, $2, $3, 1)`,
          [classroomId, bucketStart, bucketEnd]
        );
      }
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error updating score distribution: ${error}`);
    }
  }

  private async updateLanguageUsage(classroomId: number, languageId: number): Promise<void> {
    try {
      const existingRecord = await pool.query(
        `SELECT * FROM classroom_language_usage 
         WHERE classroom_id = $1 
         AND language_id = $2
         AND snapshot_time::date = CURRENT_DATE`,
        [classroomId, languageId]
      );
      
      if (existingRecord.rows.length > 0) {
        await pool.query(
          `UPDATE classroom_language_usage 
           SET submission_count = submission_count + 1
           WHERE usage_id = $1`,
          [existingRecord.rows[0].usage_id]
        );
      } else {
        await pool.query(
          `INSERT INTO classroom_language_usage 
           (classroom_id, language_id, submission_count)
           VALUES ($1, $2, 1)`,
          [classroomId, languageId]
        );
      }
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error updating language usage: ${error}`);
    }
  }

  private async updateTotalStudents(classroomId: number): Promise<void> {
    try {
      const totalStudents = await this.getTotalStudentsCount(classroomId);
      
      const existingRecord = await pool.query(
        `SELECT * FROM classroom_statistics 
         WHERE classroom_id = $1 
         AND snapshot_time::date = CURRENT_DATE`,
        [classroomId]
      );
      
      if (existingRecord.rows.length > 0) {
        await pool.query(
          `UPDATE classroom_statistics 
           SET total_students = $2,
               submissions_per_student = 
                 CASE WHEN $2 > 0 
                   THEN total_submissions::numeric / $2::numeric 
                   ELSE 0 
                 END
           WHERE stat_id = $1`,
          [existingRecord.rows[0].stat_id, totalStudents]
        );
      } else {
        await pool.query(
          `INSERT INTO classroom_statistics 
           (classroom_id, total_students)
           VALUES ($1, $2)`,
          [classroomId, totalStudents]
        );
      }
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error updating total students: ${error}`);
    }
  }

  private async getTotalStudentsCount(classroomId: number): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM classroom_enrollments WHERE classroom_id = $1',
        [classroomId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error getting total students count: ${error}`);
      return 0;
    }
  }

  private async updateClassroomStats(classroomId: number): Promise<void> {
    const fn = 'updateClassroomStats';
    try {
      logMessage(fn, `Starting full stats update for classroom ${classroomId}`);
      
      const totalStudents = await this.getTotalStudentsCount(classroomId);
      
      const activeStudentsResult = await pool.query(
        `SELECT COUNT(DISTINCT student_id) as count 
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.assignment_id
         WHERE a.classroom_id = $1
         AND s.submitted_at >= NOW() - INTERVAL '30 days'`,
        [classroomId]
      );
      const activeStudents = parseInt(activeStudentsResult.rows[0].count, 10);
      
      const submissionsResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.assignment_id
         WHERE a.classroom_id = $1`,
        [classroomId]
      );
      const totalSubmissions = parseInt(submissionsResult.rows[0].count, 10);
      
      const assignmentScoresResult = await pool.query(
        `SELECT 
           AVG(s.final_score) as avg_score,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.final_score) as median_score
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.assignment_id
         WHERE a.classroom_id = $1
         AND s.status = 'completed'`,
        [classroomId]
      );
      const avgAssignmentScore = parseFloat(assignmentScoresResult.rows[0].avg_score) || 0;
      const medianAssignmentScore = parseFloat(assignmentScoresResult.rows[0].median_score) || 0;
      
      const plagiarismResult = await pool.query(
        `SELECT 
           COUNT(*) as plagiarism_count,
           AVG(pr.similarity) as avg_similarity,
           MAX(pr.similarity) as max_similarity
         FROM plagiarism_reports pr
         JOIN submissions s ON pr.submission_id = s.submission_id
         JOIN assignments a ON s.assignment_id = a.assignment_id
         WHERE a.classroom_id = $1`,
        [classroomId]
      );
      const plagiarismCount = parseInt(plagiarismResult.rows[0].plagiarism_count, 10);
      const avgSimilarity = parseFloat(plagiarismResult.rows[0].avg_similarity) || 0;
      const maxSimilarity = parseFloat(plagiarismResult.rows[0].max_similarity) || 0;
      const plagiarismRate = totalSubmissions > 0 ? (plagiarismCount / totalSubmissions) * 100 : 0;
      
      const runtimeErrorResult = await pool.query(
        `SELECT COUNT(*) as error_count
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.assignment_id
         WHERE a.classroom_id = $1
         AND s.status = 'error'`,
        [classroomId]
      );
      const runtimeErrorCount = parseInt(runtimeErrorResult.rows[0].error_count, 10);
      const runtimeErrorRate = totalSubmissions > 0 ? (runtimeErrorCount / totalSubmissions) * 100 : 0;
      
      const assignmentCompletionResult = await pool.query(
        `WITH student_assignments AS (
           SELECT 
             ce.student_id,
             a.assignment_id,
             MAX(s.final_score) as max_score
           FROM classroom_enrollments ce
           CROSS JOIN assignments a
           LEFT JOIN submissions s ON s.assignment_id = a.assignment_id AND s.student_id = ce.student_id
           WHERE ce.classroom_id = $1 AND a.classroom_id = $1
           GROUP BY ce.student_id, a.assignment_id
         )
         SELECT 
           COUNT(*) as total_assignments,
           SUM(CASE WHEN max_score >= 70 THEN 1 ELSE 0 END) as completed_assignments
         FROM student_assignments`,
        [classroomId]
      );
      const totalAssignments = parseInt(assignmentCompletionResult.rows[0].total_assignments, 10);
      const completedAssignments = parseInt(assignmentCompletionResult.rows[0].completed_assignments, 10);
      const assignmentCompletionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
      
      const dropoffRate = totalStudents > 0 ? ((totalStudents - activeStudents) / totalStudents) * 100 : 0;
      
      const existingRecord = await pool.query(
        `SELECT * FROM classroom_statistics 
         WHERE classroom_id = $1 
         AND snapshot_time::date = CURRENT_DATE`,
        [classroomId]
      );
      
      if (existingRecord.rows.length > 0) {
        await pool.query(
          `UPDATE classroom_statistics SET
             total_students = $2,
             active_students = $3,
             active_student_rate = $4,
             total_submissions = $5,
             submissions_per_student = $6,
             avg_assignment_score = $7,
             median_assignment_score = $8,
             plagiarism_rate = $9,
             avg_similarity = $10,
             max_similarity = $11,
             runtime_error_rate = $12,
             assignment_completion_rate = $13,
             dropoff_rate = $14,
             snapshot_time = CURRENT_TIMESTAMP
           WHERE stat_id = $1`,
          [
            existingRecord.rows[0].stat_id,
            totalStudents,
            activeStudents,
            totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0,
            totalSubmissions,
            totalStudents > 0 ? totalSubmissions / totalStudents : 0,
            avgAssignmentScore,
            medianAssignmentScore,
            plagiarismRate,
            avgSimilarity,
            maxSimilarity,
            runtimeErrorRate,
            assignmentCompletionRate,
            dropoffRate
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO classroom_statistics (
             classroom_id,
             total_students,
             active_students,
             active_student_rate,
             total_submissions,
             submissions_per_student,
             avg_assignment_score,
             median_assignment_score,
             plagiarism_rate,
             avg_similarity,
             max_similarity,
             runtime_error_rate,
             assignment_completion_rate,
             dropoff_rate
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            classroomId,
            totalStudents,
            activeStudents,
            totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0,
            totalSubmissions,
            totalStudents > 0 ? totalSubmissions / totalStudents : 0,
            avgAssignmentScore,
            medianAssignmentScore,
            plagiarismRate,
            avgSimilarity,
            maxSimilarity,
            runtimeErrorRate,
            assignmentCompletionRate,
            dropoffRate
          ]
        );
      }
      logMessage(fn, `Classroom ${classroomId} stats updated successfully`);
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error updating classroom statistics: ${error}`);
    }
  }

  private async incrementRuntimeErrors(classroomId: number): Promise<void> {
    try {
      const existingRecord = await pool.query(
        `SELECT * FROM classroom_statistics 
         WHERE classroom_id = $1 
         AND snapshot_time::date = CURRENT_DATE`,
        [classroomId]
      );
      
      if (existingRecord.rows.length > 0) {
        const totalSubmissions = existingRecord.rows[0].total_submissions + 1;
        const errorCount = Math.ceil(existingRecord.rows[0].runtime_error_rate * existingRecord.rows[0].total_submissions / 100) + 1;
        const newErrorRate = (errorCount / totalSubmissions) * 100;
        
        await pool.query(
          `UPDATE classroom_statistics 
           SET runtime_error_rate = $2
           WHERE stat_id = $1`,
          [existingRecord.rows[0].stat_id, newErrorRate]
        );
      }
    } catch (error) {
      logMessage('ClassroomStatisticsService', `Error incrementing runtime errors: ${error}`);
    }
  }

  private async updatePlagiarismStats(classroomId: number, similarity: number): Promise<void> {
    try {
        const existingRecord = await pool.query(
            `SELECT * FROM classroom_statistics 
            WHERE classroom_id = $1 
            AND snapshot_time::date = CURRENT_DATE`,
            [classroomId]
        );

        if (existingRecord.rows.length > 0) {
            const currentStats = existingRecord.rows[0];
            const totalSubmissions = currentStats.total_submissions || 0;
            const currentPlagiarismCount = Math.round((currentStats.plagiarism_rate || 0) * totalSubmissions / 100);
            
            const newPlagiarismCount = currentPlagiarismCount + 1;
            const newPlagiarismRate = totalSubmissions > 0 
                ? (newPlagiarismCount / totalSubmissions) * 100 
                : 0;

            const currentTotalSimilarity = (currentStats.avg_similarity || 0) * currentPlagiarismCount;
            const newAvgSimilarity = newPlagiarismCount > 0
                ? (currentTotalSimilarity + similarity) / newPlagiarismCount
                : 0;

            const newMaxSimilarity = Math.max(currentStats.max_similarity || 0, similarity);

            await pool.query(
                `UPDATE classroom_statistics SET
                    plagiarism_rate = $1,
                    avg_similarity = $2,
                    max_similarity = $3
                WHERE stat_id = $4`,
                [newPlagiarismRate, newAvgSimilarity, newMaxSimilarity, currentStats.stat_id]
            );
        } else {
            await this.updateClassroomStats(classroomId);
            await pool.query(
                `UPDATE classroom_statistics SET
                    plagiarism_rate = $1,
                    avg_similarity = $2,
                    max_similarity = $3
                WHERE classroom_id = $4
                AND snapshot_time::date = CURRENT_DATE`,
                [100, similarity, similarity, classroomId]
            );
        }
    } catch (error) {
        logMessage('ClassroomStatisticsService', `Error updating plagiarism stats: ${error}`);
    }
  }

  private async updateStudentImprovement(classroomId: number, studentId: number, currentScore: number): Promise<void> {
    try {
        const previousAvgResult = await pool.query(
            `SELECT AVG(score) as avg_score 
             FROM submissions
             WHERE student_id = $1
             AND score IS NOT NULL
             AND submitted_at < NOW() - INTERVAL '1 week'`,
            [studentId]
        );
        const previousAvg = parseFloat(previousAvgResult.rows[0]?.avg_score) || 0;

        const improvement = currentScore - previousAvg;
        const normalizedImprovement = previousAvg > 0 
            ? (improvement / previousAvg) * 100 
            : 100;

        await pool.query(
            `UPDATE classroom_statistics SET
                total_improvement_points = COALESCE(total_improvement_points, 0) + $1,
                student_improvement_count = COALESCE(student_improvement_count, 0) + 1,
                avg_improvement = CASE 
                    WHEN COALESCE(student_improvement_count, 0) > 0 
                    THEN (COALESCE(total_improvement_points, 0) + $1) / (COALESCE(student_improvement_count, 0) + 1)
                    ELSE $1 
                END
             WHERE classroom_id = $2
             AND snapshot_time::date = CURRENT_DATE`,
            [normalizedImprovement, classroomId]
        );
    } catch (error) {
        logMessage('ClassroomStatisticsService', `Error updating student improvement: ${error}`);
    }
  }

  private async updateLanguageTrends(classroomId: number, languageId: number): Promise<void> {
    try {
        // 30 day language popularity
        await pool.query(
            `INSERT INTO classroom_language_trends (
                classroom_id,
                language_id,
                submission_count,
                success_rate,
                avg_runtime
             )
             SELECT 
                $1,
                $2,
                COUNT(*) as submission_count,
                AVG(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) * 100 as success_rate,
                AVG(s.average_runtime) as avg_runtime
             FROM submissions s
             JOIN assignments a ON s.assignment_id = a.assignment_id
             WHERE a.classroom_id = $1
             AND s.language_id = $2
             AND s.submitted_at >= NOW() - INTERVAL '30 days'
             ON CONFLICT (classroom_id, language_id)
             DO UPDATE SET
                submission_count = EXCLUDED.submission_count,
                success_rate = EXCLUDED.success_rate,
                avg_runtime = EXCLUDED.avg_runtime`,
            [classroomId, languageId]
        );
    } catch (error) {
        logMessage('ClassroomStatisticsService', `Error updating language trends: ${error}`);
    }
  }


private async updateConceptMastery(classroomId: number, testResults: TestResult[]): Promise<void> {
    try {
        const conceptMap = new Map<string, { passed: number; total: number }>();
        
        testResults.forEach(test => {
            const concept = test.testCaseId ? this.getConceptForTestCase(test.testCaseId) : 'Unknown';
            if (!conceptMap.has(concept)) {
                conceptMap.set(concept, { passed: 0, total: 0 });
            }
            const entry = conceptMap.get(concept)!;
            entry.total++;
            if (test.status === 'passed') entry.passed++;
        });

        for (const [concept, { passed, total }] of conceptMap) {
            const masteryRate = total > 0 ? (passed / total) * 100 : 0;
            
            await pool.query(
                `INSERT INTO classroom_concept_mastery (
                    classroom_id,
                    concept,
                    mastery_rate,
                    snapshot_date
                 ) VALUES ($1, $2, $3, CURRENT_DATE)
                 ON CONFLICT (classroom_id, concept, snapshot_date)
                 DO UPDATE SET mastery_rate = $3`,
                [classroomId, concept, masteryRate]
            );
        }
    } catch (error) {
        logMessage('ClassroomStatisticsService', `Error updating concept mastery: ${error}`);
    }
}

// kill this?
private getConceptForTestCase(testCaseId: number): string {
    return 'Algorithm Design';
}
}