import pool from "../config/db";
import logger from "../config/logger";
import { Language } from "../types"


export const getLanguages = async (): Promise<Language[]> => {
  const functionName = "getLanguages";
  try {
    logger.info({ functionName }, "Fetching all languages.");
    const query = "SELECT * FROM languages";
    const result = await pool.query(query);
    logger.info(
      { functionName, count: result.rowCount },
      `Fetched ${result.rowCount} languages.`
    );
    return result.rows;
  } catch (error) {
    logger.error({ functionName, error }, `Error fetching languages: ${error}`);
    throw error;
  }
};

export const getLanguageById = async (languageId: number): Promise<Language> => {
  const functionName = "getLanguageById";
  try {
    logger.info({ functionName, languageId }, `Fetching language with ID: ${languageId}.`);
    const query = "SELECT * FROM languages WHERE language_id = $1";
    const result = await pool.query(query, [languageId]);
    if (result.rowCount === 0) {
      logger.warn(
        { functionName, languageId },
        `Language not found for ID: ${languageId}.`
      );
      throw new Error("Language not found");
    }
    logger.info({ functionName, languageId }, "Language fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logger.error({ functionName, languageId, error }, `Error fetching language: ${error}`);
    throw error;
  }
};

export const createLanguage = async (name: string, version?: string): Promise<number> => {
  const functionName = "createLanguage";
  try {
    logger.info({ functionName, name, version }, `Creating language with name: ${name}.`);
    const query = `
      INSERT INTO languages (name, version)
      VALUES ($1, $2)
      RETURNING language_id
    `;
    const result = await pool.query(query, [name, version || null]);
    const languageId: number = result.rows[0].language_id;
    logger.info(
      { functionName, languageId },
      `Language created with ID: ${languageId}.`
    );
    return languageId;
  } catch (error) {
    logger.error({ functionName, name, version, error }, `Error creating language: ${error}`);
    throw error;
  }
};
