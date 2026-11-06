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

// The number embedded in a group name ("Group-3" -> 3, "Lab 3" -> 3), used to
// match a CSV's lab_group value to an existing group. Mirrors the client rule.
const groupNumberOf = (name: string): number | null => {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : null;
};

/**
 * One-shot roster import: given buckets of {groupNumber, studentIds}, create any
 * group that doesn't already exist for that number (named "Group-N") and set
 * each group's roster, all in a single transaction. This removes the old
 * two-step dance (hand-create groups, then import) -- one CSV builds and fills
 * every group. Returns which groups were created and the per-group counts.
 */
export const importGroupRosters = async (
  classroomId: number,
  buckets: { groupNumber: number; studentIds: number[] }[]
): Promise<{ created: string[]; assignments: { name: string; count: number }[] }> => {
  const fn = "importGroupRosters";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: existing } = await client.query(
      `SELECT group_id, name FROM lab_groups WHERE classroom_id = $1`,
      [classroomId]
    );
    // groupNumber -> group_id, and group_id -> name, from current groups.
    const idByNumber = new Map<number, number>();
    const nameById = new Map<number, string>();
    for (const g of existing) {
      nameById.set(g.group_id, g.name);
      const n = groupNumberOf(g.name);
      if (n !== null && !idByNumber.has(n)) idByNumber.set(n, g.group_id);
    }

    const created: string[] = [];
    const assignments: { name: string; count: number }[] = [];

    const insertEnrollment = `
      INSERT INTO lab_group_enrollments (group_id, classroom_id, student_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (classroom_id, student_id) DO UPDATE SET group_id = EXCLUDED.group_id
    `;

    for (const bucket of buckets) {
      let groupId = idByNumber.get(bucket.groupNumber);
      let name: string;
      if (groupId === undefined) {
        name = `Group-${bucket.groupNumber}`;
        const { rows } = await client.query(
          `INSERT INTO lab_groups (classroom_id, name) VALUES ($1, $2) RETURNING group_id`,
          [classroomId, name]
        );
        groupId = rows[0].group_id as number;
        idByNumber.set(bucket.groupNumber, groupId);
        nameById.set(groupId, name);
        created.push(name);
      } else {
        name = nameById.get(groupId) ?? `Group-${bucket.groupNumber}`;
      }

      // Full replace of this group's roster (idempotent re-runs). Moving a
      // student from another group is handled by the ON CONFLICT above.
      await client.query(`DELETE FROM lab_group_enrollments WHERE group_id = $1`, [groupId]);
      for (const studentId of bucket.studentIds) {
        await client.query(insertEnrollment, [groupId, classroomId, studentId]);
      }
      assignments.push({ name, count: bucket.studentIds.length });
    }

    await client.query("COMMIT");
    logger.info(
      { fn, classroomId, created: created.length, groups: assignments.length },
      `Imported rosters for ${assignments.length} group(s), created ${created.length}`
    );
    return { created, assignments };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ fn, classroomId, error }, `Error importing group rosters: ${error}`);
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
