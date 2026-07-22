import pool from "../config/db";
import logger from "../config/logger";
import { LabSession, LabAttendanceRecord, AttendanceReportRow } from "../types";

export const findOrCreateSession = async (
  classroomId: number,
  groupId: number | null,
  sessionDate: string
): Promise<LabSession> => {
  const fn = "findOrCreateSession";
  try {
    const existing = await pool.query(
      `SELECT session_id, classroom_id, group_id, session_date, start_time, end_time, created_at
       FROM lab_sessions
       WHERE classroom_id = $1 AND session_date = $3
         AND group_id IS NOT DISTINCT FROM $2`,
      [classroomId, groupId, sessionDate]
    );

    let sessionRow;
    if (existing.rows.length > 0) {
      sessionRow = existing.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO lab_sessions (classroom_id, group_id, session_date)
         VALUES ($1, $2, $3)
         RETURNING session_id, classroom_id, group_id, session_date, start_time, end_time, created_at`,
        [classroomId, groupId, sessionDate]
      );
      sessionRow = inserted.rows[0];
      logger.info({ fn, sessionId: sessionRow.session_id }, "Created new lab session");
    }

    const rosterQuery = groupId
      ? `SELECT s.student_id, u.first_name, u.last_name, u.email, la.status
         FROM lab_group_enrollments lge
         JOIN students s ON s.student_id = lge.student_id
         JOIN users u ON u.user_id = s.user_id
         LEFT JOIN lab_attendance la ON la.session_id = $2 AND la.student_id = s.student_id
         WHERE lge.group_id = $1
         ORDER BY u.first_name, u.last_name`
      : `SELECT s.student_id, u.first_name, u.last_name, u.email, la.status
         FROM classroom_enrollments ce
         JOIN students s ON s.student_id = ce.student_id
         JOIN users u ON u.user_id = s.user_id
         LEFT JOIN lab_attendance la ON la.session_id = $2 AND la.student_id = s.student_id
         WHERE ce.classroom_id = $1
         ORDER BY u.first_name, u.last_name`;

    const rosterParam = groupId ?? classroomId;
    const roster = await pool.query(rosterQuery, [rosterParam, sessionRow.session_id]);

    return {
      sessionId: sessionRow.session_id,
      classroomId: sessionRow.classroom_id,
      groupId: sessionRow.group_id,
      sessionDate: sessionRow.session_date,
      startTime: sessionRow.start_time,
      endTime: sessionRow.end_time,
      created_at: sessionRow.created_at,
      roster: roster.rows.map((r: any) => ({
        studentId: r.student_id,
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        status: r.status ?? null,
      })),
    };
  } catch (error) {
    logger.error({ fn, classroomId, groupId, sessionDate, error }, `Error finding/creating session: ${error}`);
    throw error;
  }
};

export const getSessionById = async (sessionId: number): Promise<LabSession | null> => {
  const { rows } = await pool.query(
    `SELECT session_id, classroom_id, group_id, session_date, start_time, end_time, created_at
     FROM lab_sessions WHERE session_id = $1`,
    [sessionId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    sessionId: row.session_id,
    classroomId: row.classroom_id,
    groupId: row.group_id,
    sessionDate: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    created_at: row.created_at,
  };
};

export const saveAttendance = async (
  sessionId: number,
  records: LabAttendanceRecord[]
): Promise<void> => {
  const fn = "saveAttendance";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upsertQuery = `
      INSERT INTO lab_attendance (session_id, student_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, student_id) DO UPDATE
        SET status = EXCLUDED.status, marked_at = CURRENT_TIMESTAMP
    `;
    for (const record of records) {
      await client.query(upsertQuery, [sessionId, record.studentId, record.status]);
    }
    await client.query("COMMIT");
    logger.info({ fn, sessionId, count: records.length }, "Saved attendance records");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ fn, sessionId, error }, `Error saving attendance: ${error}`);
    throw error;
  } finally {
    client.release();
  }
};

export const listSessions = async (
  classroomId: number,
  groupId?: number
): Promise<LabSession[]> => {
  const fn = "listSessions";
  try {
    const query = groupId
      ? `SELECT session_id, classroom_id, group_id, session_date, start_time, end_time, created_at
         FROM lab_sessions WHERE classroom_id = $1 AND group_id = $2
         ORDER BY session_date DESC`
      : `SELECT session_id, classroom_id, group_id, session_date, start_time, end_time, created_at
         FROM lab_sessions WHERE classroom_id = $1
         ORDER BY session_date DESC`;
    const params = groupId ? [classroomId, groupId] : [classroomId];
    const { rows } = await pool.query(query, params);
    return rows.map((row: any) => ({
      sessionId: row.session_id,
      classroomId: row.classroom_id,
      groupId: row.group_id,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      created_at: row.created_at,
    }));
  } catch (error) {
    logger.error({ fn, classroomId, groupId, error }, `Error listing sessions: ${error}`);
    throw error;
  }
};

export const getAttendanceReport = async (
  assignmentId: number,
  sessionId: number
): Promise<AttendanceReportRow[]> => {
  const fn = "getAttendanceReport";
  try {
    const query = `
      SELECT s.submission_id AS "submissionId",
             s.student_id AS "studentId",
             u.first_name AS "firstName",
             u.last_name AS "lastName",
             u.email,
             s.submitted_at AS "submittedAt",
             la.status AS "attendanceStatus"
      FROM submissions s
      JOIN students st ON st.student_id = s.student_id
      JOIN users u ON u.user_id = st.user_id
      LEFT JOIN lab_attendance la ON la.session_id = $2 AND la.student_id = s.student_id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `;
    const { rows } = await pool.query(query, [assignmentId, sessionId]);
    return rows;
  } catch (error) {
    logger.error({ fn, assignmentId, sessionId, error }, `Error building attendance report: ${error}`);
    throw error;
  }
};
