import { Router } from 'express';
import {
  createQuizController,
  deleteQuizController,
  getQuizByIdController,
  getQuizzesByClassroomController,
  togglePublishController,
  updateQuizController,
} from '../controllers/QuizController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';

const router = Router();

// Instructor routes
router.post(
  '/',
  authMiddleware,
  requireRole(['instructor']),
  createQuizController
);

router.get(
  '/classroom/:classroomId',
  authMiddleware,
  getQuizzesByClassroomController
);

router.get(
  '/:quizId',
  authMiddleware,
  getQuizByIdController
);

router.put(
  '/:quizId',
  authMiddleware,
  requireRole(['instructor']),
  updateQuizController
);

router.patch(
  '/:quizId/publish',
  authMiddleware,
  requireRole(['instructor']),
  togglePublishController
);

router.delete(
  '/:quizId',
  authMiddleware,
  requireRole(['instructor']),
  deleteQuizController
);

export default router;
