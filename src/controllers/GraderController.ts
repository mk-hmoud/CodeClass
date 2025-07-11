import { Request, Response } from 'express';
import { updateManualGrade } from '../services/grading/Grader';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [GraderController.ts] [${functionName}] ${message}\n`);
};


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
    logMessage(functionName, `Received request to update manual grade: ${JSON.stringify(req.body)}`);

    if (!req.user) {
      logMessage(functionName, 'No user on request');
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role !== 'instructor') {
      logMessage(functionName, `Forbidden: user role is ${req.user.role}`);
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    logMessage(functionName, `Authorized instructor ${req.user.id}`);

    console.log(req.body);
    const { submissionId, manualScore, feedback } = req.body as UpdateManualGradeParams;
    console.log(submissionId);
    if (
      typeof submissionId !== 'number' ||
      typeof manualScore !== 'number'
    ) {
      logMessage(functionName, 'Bad request: invalid submissionId or manualScore');
      res
        .status(400)
        .json({ success: false, message: 'submissionId (number) and manualScore (0–100) are required' });
      return;
    }

    logMessage(
      functionName,
      `Calling updateManualGrade(submissionId=${submissionId}, manualScore=${manualScore}, feedback=${JSON.stringify(
        feedback
      )})`
    );

    const updated = await updateManualGrade({ submissionId, manualScore, feedback });

    logMessage(
      functionName,
      `Update successful for submission ${submissionId}: final_score=${updated.final_score}`
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logMessage(functionName, `Error in updateManualGradeController: ${error.message || error}`);
    res.status(500).json({ success: false, message: 'Failed to update manual grade' });
  }
};
