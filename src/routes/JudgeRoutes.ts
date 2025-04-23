import { Router } from 'express';
import { runCodeHandler } from '../controllers/JudgeController';

const router = Router();

router.post('/run', runCodeHandler);

export default router;
