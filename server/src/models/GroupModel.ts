import pool from "../config/db";
import logger from "../config/logger";
import { LabGroup, LabGroupCreationData } from "../types";

export const getClassroomInstructorId = async (
  classroomId: number
): Promise<number | null> => {
  const { rows } = await pool.query(
    `SELECT instructor_id FROM classrooms WHERE classroom_id = $1`,
    [classroomId]
  );
  return rows[0]?.instructor_id ?? null;
};

export const createGroup = async (
  data: LabGroupCreationData
): Promise<{ groupId: number }> => {
  const fn = "createGroup";
  try {
    const query = `
      INSERT INTO lab_groups (classroom_id, name, day_of_week, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING group_id
    `;
    const { rows } = await pool.query(query, [
      data.classroomId,
      data.name,
      data.dayOfWeek ?? null,
      data.startTime ?? null,
      data.endTime ?? null,
    ]);
    const groupId: number = rows[0].group_id;
    logger.info({ fn, groupId }, `Created lab group with ID: ${groupId}`);
    return { groupId };
  } catch (error) {
    logger.error({ fn, error }, `Error creating group: ${error}`);
    throw error;
  }
};

export const getGroupById = async (groupId: number): Promise<LabGroup | null> => {
  const { rows } = await pool.query(
    `SELECT group_id, classroom_id, name, day_of_week, start_time, end_time, created_at
     FROM lab_groups WHERE group_id = $1`,
    [groupId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    groupId: row.group_id,
    classroomId: row.classroom_id,
    name: row.name,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    created_at: row.created_at,
  };
};

export const getGroupsByClassroom = async (
  classroomId: number
): Promise<LabGroup[]> => {
  const fn = "getGroupsByClassroom";
  try {
    const query = `
      SELECT
        g.group_id, g.classroom_id, g.name, g.day_of_week, g.start_time, g.end_time, g.created_at,
        COALESCE(
          json_agg(
            json_build_object('studentId', lge.student_id)
          ) FILTER (WHERE lge.student_id IS NOT NULL),
          '[]'
        ) AS roster
      FROM lab_groups g
      LEFT JOIN lab_group_enrollments lge ON lge.group_id = g.group_id
      WHERE g.classroom_id = $1
      GROUP BY g.group_id
      ORDER BY g.created_at ASC
    `;
    const { rows } = await pool.query(query, [classroomId]);
    return rows.map((row: any) => ({
      groupId: row.group_id,
      classroomId: row.classroom_id,
      name: row.name,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      created_at: row.created_at,
      roster: row.roster.map((r: any) => r.studentId),
    }));
  } catch (error) {
    logger.error({ fn, classroomId, error }, `Error fetching groups: ${error}`);
    throw error;
  }
};

export const updateGroup = async (
  groupId: number,
  data: LabGroupCreationData
): Promise<void> => {
  const fn = "updateGroup";
  try {
    await pool.query(
      `UPDATE lab_groups
       SET name = $1, day_of_week = $2, start_time = $3, end_time = $4
       WHERE group_id = $5`,
      [data.name, data.dayOfWeek ?? null, data.startTime ?? null, data.endTime ?? null, groupId]
    );
  } catch (error) {
    logger.error({ fn, groupId, error }, `Error updating group: ${error}`);
    throw error;
  }
};

export const deleteGroup = async (groupId: number): Promise<void> => {
  const fn = "deleteGroup";
  try {
    await pool.query(`DELETE FROM lab_groups WHERE group_id = $1`, [groupId]);
    logger.info({ fn, groupId }, `Deleted group with ID: ${groupId}`);
  } catch (error) {
    logger.error({ fn, groupId, error }, `Error deleting group: ${error}`);
    throw error;
  }
};

export const setGroupRoster = async (
  groupId: number,
  classroomId: number,
  studentIds: number[]
): Promise<void> => {
  const fn = "setGroupRoster";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM lab_group_enrollments WHERE group_id = $1`, [groupId]);

    if (studentIds.length > 0) {
      const insertQuery = `
        INSERT INTO lab_group_enrollments (group_id, classroom_id, student_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (classroom_id, student_id) DO UPDATE SET group_id = EXCLUDED.group_id
      `;
      for (const studentId of studentIds) {
        await client.query(insertQuery, [groupId, classroomId, studentId]);
      }
    }

    await client.query("COMMIT");
    logger.info(
      { fn, groupId, classroomId, rosterSize: studentIds.length },
      `Set roster for group ${groupId}`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ fn, groupId, error }, `Error setting group roster: ${error}`);
    throw error;
  } finally {
    client.release();
  }
};

export const getStudentGroupInClassroom = async (
  classroomId: number,
  studentId: number
): Promise<number | null> => {
  const { rows } = await pool.query(
    `SELECT group_id FROM lab_group_enrollments WHERE classroom_id = $1 AND student_id = $2`,
    [classroomId, studentId]
  );
  return rows[0]?.group_id ?? null;
};
