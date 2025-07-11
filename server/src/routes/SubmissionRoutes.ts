import { Router } from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { updateManualGradeController } from '../controllers/GraderController';

const router = Router();
//router.use(requireRole(["instructor"]));

router.post('/:submissionId/grade', authMiddleware, updateManualGradeController);


export default router;