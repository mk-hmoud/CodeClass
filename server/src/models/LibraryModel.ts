import pool from "../config/db";
import logger from "../config/logger";
import { Library, LibraryCreationData } from "../types";

export const createLibrary = async (
  data: LibraryCreationData
): Promise<{ libraryId: number }> => {
  const fn = "createLibrary";
  const client = await pool.connect();
  try {
    logger.info({ fn }, "Beginning transaction for library creation.");
    await client.query("BEGIN");

    const insertLibraryQuery = `
      INSERT INTO libraries (instructor_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING library_id
    `;
    const result = await client.query(insertLibraryQuery, [
      data.instructorId,
      data.name,
      data.description || null,
    ]);
    const libraryId: number = result.rows[0].library_id;
    logger.info({ fn, libraryId }, `Inserted library with ID: ${libraryId}`);

    if (data.files && data.files.length > 0) {
      const insertFileQuery = `
        INSERT INTO library_files (library_id, language_id, content)
        VALUES ($1, $2, $3)
      `;
      for (const file of data.files) {
        await client.query(insertFileQuery, [
          libraryId,
          file.languageId,
          file.content,
        ]);
      }
      logger.info(
        { fn, libraryId, fileCount: data.files.length },
        `Inserted ${data.files.length} file(s) for library ID: ${libraryId}`
      );
    }

    await client.query("COMMIT");
    return { libraryId };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      { fn, error },
      `Transaction rolled back due to error: ${error}`
    );
    throw error;
  } finally {
    client.release();
  }
};

export const getLibraryById = async (
  libraryId: number
): Promise<Library | null> => {
  const fn = "getLibraryById";
  try {
    const query = `SELECT * FROM libraries WHERE library_id = $1`;
    const result = await pool.query(query, [libraryId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];

    const filesQuery = `
      SELECT language_id, content FROM library_files
      WHERE library_id = $1
      ORDER BY language_id ASC
    `;
    const filesResult = await pool.query(filesQuery, [libraryId]);

    const library: Library = {
      libraryId: row.library_id,
      instructorId: row.instructor_id,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
      files: filesResult.rows.map((f: any) => ({
        languageId: f.language_id,
        content: f.content,
      })),
    };

    logger.info({ fn, libraryId }, `Fetched library with ID: ${libraryId}`);
    return library;
  } catch (error) {
    logger.error({ fn, libraryId, error }, `Error fetching library: ${error}`);
    throw error;
  }
};

export const getLibrariesByInstructor = async (
  instructorId: number
): Promise<Omit<Library, "files">[]> => {
  const fn = "getLibrariesByInstructor";
  try {
    const query = `
      SELECT library_id, instructor_id, name, description, created_at
      FROM libraries
      WHERE instructor_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [instructorId]);
    logger.info(
      { fn, instructorId, count: result.rows.length },
      `Fetched ${result.rows.length} libraries for instructor ID: ${instructorId}`
    );
    return result.rows.map((row: any) => ({
      libraryId: row.library_id,
      instructorId: row.instructor_id,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
    }));
  } catch (error) {
    logger.error(
      { fn, instructorId, error },
      `Error fetching libraries: ${error}`
    );
    throw error;
  }
};

export const updateLibrary = async (
  libraryId: number,
  data: LibraryCreationData
): Promise<Library> => {
  const fn = "updateLibrary";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateQuery = `
      UPDATE libraries
      SET name = $1, description = $2
      WHERE library_id = $3
    `;
    await client.query(updateQuery, [
      data.name,
      data.description || null,
      libraryId,
    ]);

    await client.query(`DELETE FROM library_files WHERE library_id = $1`, [
      libraryId,
    ]);

    if (data.files && data.files.length > 0) {
      const insertFileQuery = `
        INSERT INTO library_files (library_id, language_id, content)
        VALUES ($1, $2, $3)
      `;
      for (const file of data.files) {
        await client.query(insertFileQuery, [
          libraryId,
          file.languageId,
          file.content,
        ]);
      }
    }

    await client.query("COMMIT");
    logger.info({ fn, libraryId }, `Updated library with ID: ${libraryId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ fn, libraryId, error }, `Error updating library: ${error}`);
    throw error;
  } finally {
    client.release();
  }

  const updated = await getLibraryById(libraryId);
  if (!updated) {
    throw new Error(`Library ${libraryId} not found after update`);
  }
  return updated;
};

export const deleteLibrary = async (libraryId: number): Promise<void> => {
  const fn = "deleteLibrary";
  try {
    const query = `DELETE FROM libraries WHERE library_id = $1`;
    await pool.query(query, [libraryId]);
    logger.info({ fn, libraryId }, `Deleted library with ID: ${libraryId}`);
  } catch (error) {
    logger.error({ fn, libraryId, error }, `Error deleting library: ${error}`);
    throw error;
  }
};

export const getLibraryCodeForAssignment = async (
  assignmentId: number,
  languageName: string
): Promise<string | null> => {
  const fn = "getLibraryCodeForAssignment";
  try {
    const query = `
      SELECT lf.content
      FROM assignments a
      JOIN library_files lf ON lf.library_id = a.library_id
      JOIN languages l ON l.language_id = lf.language_id
      WHERE a.assignment_id = $1 AND l.name = $2
    `;
    const { rows } = await pool.query(query, [assignmentId, languageName]);
    return rows[0]?.content ?? null;
  } catch (error) {
    logger.error(
      { fn, assignmentId, languageName, error },
      `Error fetching library code for assignment: ${error}`
    );
    throw error;
  }
};
