import logger from '../config/logger';
import { Request, Response } from 'express';
import { updateManualGrade } from '../services/grading/Grader';


interface UpdateManualGradeParams {
  submissionId: number;
  manualScore: number;
  feedback?: string;
}

export const updateManualGradeController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const functionName = 'updateManualGradeController';
  try {
    logger.info(
      { fn: functionName, body: req.body },
      `Received request to update manual grade: ${JSON.stringify(req.body)}`
    );

    if (!req.user) {
      logger.warn(
        { fn: functionName },
        'No user on request'
      );
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role !== 'instructor') {
      logger.warn(
        { fn: functionName, userId: req.user?.id, role: req.user?.role },
        `Forbidden: user role is ${req.user?.role}`
      );
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    logger.info(
      { fn: functionName, instructorId: req.user.id },
      `Authorized instructor ${req.user.id}`
    );

    console.log(req.body);
    const { submissionId, manualScore, feedback } = req.body as UpdateManualGradeParams;
    console.log(submissionId);
    if (
      typeof submissionId !== 'number' ||
      typeof manualScore !== 'number'
    ) {
      logger.warn(
        { fn: functionName, submissionId, manualScore },
        'Bad request: invalid submissionId or manualScore'
      );
      res
        .status(400)
        .json({ success: false, message: 'submissionId (number) and manualScore (0–100) are required' });
      return;
    }

    logger.debug(
      {
        fn: functionName,
        submissionId,
        manualScore,
        feedback
      },
      `Calling updateManualGrade(submissionId=${submissionId}, manualScore=${manualScore}, feedback=${JSON.stringify(
        feedback
      )})`
    );

    const updated = await updateManualGrade({ submissionId, manualScore, feedback });

    logger.info(
      {
        fn: functionName,
        submissionId,
        final_score: updated.final_score
      },
      `Update successful for submission ${submissionId}: final_score=${updated.final_score}`
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error(
      {
        fn: functionName,
        error: error.message || error
      },
      `Error in updateManualGradeController: ${error.message || error}`
    );
    res.status(500).json({ success: false, message: 'Failed to update manual grade' });
  }
};
