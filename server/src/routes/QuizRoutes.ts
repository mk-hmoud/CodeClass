import { Router } from 'express';
import { createQuizController, deleteQuizController } from '../controllers/QuizController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';

const router = Router();

router.post(
    '/', 
    authMiddleware, 
    requireRole(["instructor"]), 
    createQuizController
);

router.delete(
    '/:quizId',
    authMiddleware,
    requireRole(["instructor"]),
    deleteQuizController
);

export default router;