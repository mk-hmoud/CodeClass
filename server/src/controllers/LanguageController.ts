import logger from '../config/logger';

import { Request, Response } from 'express';
import { getLanguages } from '../models/LanguageModel';


export const getLanguagesController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getLanguagesController';
  try {
    logger.info(
      { fn: functionName },
      "Received request to get all languages."
    );
    const languages = await getLanguages();
    logger.info(
      { fn: functionName, count: languages.length },
      `Successfully retrieved ${languages.length} languages.`
    );
    
    res.status(200).json({ success: true, data: languages });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error fetching languages: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to fetch languages' });
  }
};