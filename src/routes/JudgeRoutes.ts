import { Router } from 'express';
import { getStatusHandler, runCodeHandler, submitHandler } from '../controllers/JudgeController';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

router.post('/run', runCodeHandler);
router.get('/status/:jobId', getStatusHandler);
router.post('/submit', authMiddleware, submitHandler);

export default router;
