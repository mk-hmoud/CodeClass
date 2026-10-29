import { Router } from 'express';
import { getRunStatusHandler, getSubmitStatusHandler, runCodeHandler, submitHandler, previewGradeHandler } from '../controllers/JudgeController';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

router.post('/run', runCodeHandler);
router.get('/status/run/:jobId', getRunStatusHandler);
router.get('/status/submit/:jobId', getSubmitStatusHandler);
router.post('/submit', authMiddleware, submitHandler);
router.post('/preview-grade', authMiddleware, previewGradeHandler);

export default router;
