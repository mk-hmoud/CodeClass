import pool from "../config/db";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [LanguageModel.ts] [${functionName}] ${message}`);
};

export interface Language {
  language_id: number;
  name: string;
  version?: string;
}

export const getLanguages = async (): Promise<Language[]> => {
  const functionName = "getLanguages";
  try {
    logMessage(functionName, "Fetching all languages.");
    const query = "SELECT * FROM languages";
    const result = await pool.query(query);
    logMessage(functionName, `Fetched ${result.rowCount} languages.`);
    return result.rows;
  } catch (error) {
    logMessage(functionName, `Error fetching languages: ${error}`);
    throw error;
  }
};

export const getLanguageById = async (languageId: number): Promise<Language> => {
  const functionName = "getLanguageById";
  try {
    logMessage(functionName, `Fetching language with ID: ${languageId}.`);
    const query = "SELECT * FROM languages WHERE language_id = $1";
    const result = await pool.query(query, [languageId]);
    if (result.rowCount === 0) {
      logMessage(functionName, `Language not found for ID: ${languageId}.`);
      throw new Error("Language not found");
    }
    logMessage(functionName, "Language fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching language: ${error}`);
    throw error;
  }
};

export const createLanguage = async (name: string, version?: string): Promise<number> => {
  const functionName = "createLanguage";
  try {
    logMessage(functionName, `Creating language with name: ${name}.`);
    const query = `
      INSERT INTO languages (name, version)
      VALUES ($1, $2)
      RETURNING language_id
    `;
    const result = await pool.query(query, [name, version || null]);
    const languageId: number = result.rows[0].language_id;
    logMessage(functionName, `Language created with ID: ${languageId}.`);
    return languageId;
  } catch (error) {
    logMessage(functionName, `Error creating language: ${error}`);
    throw error;
  }
};
