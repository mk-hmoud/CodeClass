import { Router } from 'express';
import { getStatusHandler, runCodeHandler } from '../controllers/JudgeController';

const router = Router();

router.post('/run', runCodeHandler);
router.get('/status/:jobId', getStatusHandler);

export default router;
