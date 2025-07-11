import { Request, Response } from 'express';
import { getLanguages } from '../models/LanguageModel';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [LanguageController.ts] [${functionName}] ${message}`);
};

export const getLanguagesController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getLanguagesController';
  try {
    logMessage(functionName, "Received request to get all languages.");
    const languages = await getLanguages();
    logMessage(functionName, `Successfully retrieved ${languages.length} languages.`);
    res.status(200).json({ success: true, data: languages });
  } catch (error) {
    logMessage(functionName, `Error fetching languages: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch languages' });
  }
};