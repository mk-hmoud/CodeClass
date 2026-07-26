import pool from "../config/db";
import logger from "../config/logger";
import { SchemaLibrary, SchemaLibraryCreationData } from "../types";

const mapRow = (row: any): SchemaLibrary => ({
  schemaLibraryId: row.schema_library_id,
  instructorId: row.instructor_id,
  name: row.name,
  description: row.description,
  setupSql: row.setup_sql,
  created_at: row.created_at,
});

export const createSchemaLibrary = async (
  data: SchemaLibraryCreationData
): Promise<SchemaLibrary> => {
  const fn = "createSchemaLibrary";
  try {
    const query = `
      INSERT INTO schema_libraries (instructor_id, name, description, setup_sql)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.instructorId,
      data.name,
      data.description || null,
      data.setupSql,
    ]);
    logger.info({ fn, schemaLibraryId: rows[0].schema_library_id }, `Created schema library "${data.name}"`);
    return mapRow(rows[0]);
  } catch (error) {
    logger.error({ fn, error }, `Error creating schema library: ${error}`);
    throw error;
  }
};

export const getSchemaLibraryById = async (
  schemaLibraryId: number
): Promise<SchemaLibrary | null> => {
  const fn = "getSchemaLibraryById";
  try {
    const { rows } = await pool.query(
      `SELECT * FROM schema_libraries WHERE schema_library_id = $1`,
      [schemaLibraryId]
    );
    if (rows.length === 0) return null;
    return mapRow(rows[0]);
  } catch (error) {
    logger.error({ fn, schemaLibraryId, error }, `Error fetching schema library: ${error}`);
    throw error;
  }
};

export const getSchemaLibrariesByInstructor = async (
  instructorId: number
): Promise<SchemaLibrary[]> => {
  const fn = "getSchemaLibrariesByInstructor";
  try {
    const { rows } = await pool.query(
      `SELECT * FROM schema_libraries WHERE instructor_id = $1 ORDER BY created_at DESC`,
      [instructorId]
    );
    return rows.map(mapRow);
  } catch (error) {
    logger.error({ fn, instructorId, error }, `Error fetching schema libraries: ${error}`);
    throw error;
  }
};

export const updateSchemaLibrary = async (
  schemaLibraryId: number,
  data: SchemaLibraryCreationData
): Promise<SchemaLibrary> => {
  const fn = "updateSchemaLibrary";
  try {
    const query = `
      UPDATE schema_libraries
      SET name = $1, description = $2, setup_sql = $3
      WHERE schema_library_id = $4
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      data.name,
      data.description || null,
      data.setupSql,
      schemaLibraryId,
    ]);
    logger.info({ fn, schemaLibraryId }, `Updated schema library ${schemaLibraryId}`);
    return mapRow(rows[0]);
  } catch (error) {
    logger.error({ fn, schemaLibraryId, error }, `Error updating schema library: ${error}`);
    throw error;
  }
};

export const deleteSchemaLibrary = async (schemaLibraryId: number): Promise<void> => {
  const fn = "deleteSchemaLibrary";
  try {
    await pool.query(`DELETE FROM schema_libraries WHERE schema_library_id = $1`, [schemaLibraryId]);
    logger.info({ fn, schemaLibraryId }, `Deleted schema library ${schemaLibraryId}`);
  } catch (error) {
    logger.error({ fn, schemaLibraryId, error }, `Error deleting schema library: ${error}`);
    throw error;
  }
};
