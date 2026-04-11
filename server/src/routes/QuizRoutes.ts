import { Router } from 'express';
import {
  createQuizController,
  deleteQuizController,
  getQuizByIdController,
  getQuizzesByClassroomController,
  togglePublishController,
  updateQuizController,
} from '../controllers/QuizController';
import {
  getQuizResultsController,
  getQuizSubmitStatusController,
  getSessionController,
  getSessionResultsController,
  startSessionController,
  submitProblemController,
  submitSessionController,
} from '../controllers/QuizSessionController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';

const router = Router();

// ── Instructor: quiz CRUD ─────────────────────────────────────────────────────
router.post('/', authMiddleware, requireRole(['instructor']), createQuizController);
router.get('/classroom/:classroomId', authMiddleware, getQuizzesByClassroomController);
router.put('/:quizId', authMiddleware, requireRole(['instructor']), updateQuizController);
router.patch('/:quizId/publish', authMiddleware, requireRole(['instructor']), togglePublishController);
router.delete('/:quizId', authMiddleware, requireRole(['instructor']), deleteQuizController);

// ── Instructor: quiz results ──────────────────────────────────────────────────
router.get('/:quizId/results', authMiddleware, requireRole(['instructor']), getQuizResultsController);

// ── Student: session lifecycle ────────────────────────────────────────────────
router.post('/:quizId/sessions', authMiddleware, requireRole(['student']), startSessionController);

// ── Submission status (student polls their own job) ───────────────────────────
router.get('/submissions/:submissionId/status', authMiddleware, getQuizSubmitStatusController);

// ── Session-scoped routes ─────────────────────────────────────────────────────
router.get('/sessions/:sessionId', authMiddleware, requireRole(['student']), getSessionController);
router.post('/sessions/:sessionId/submit', authMiddleware, requireRole(['student']), submitSessionController);
router.post(
  '/sessions/:sessionId/problems/:quizProblemId/submit',
  authMiddleware,
  requireRole(['student']),
  submitProblemController
);
router.get('/sessions/:sessionId/results', authMiddleware, getSessionResultsController);

// ── Quiz detail (instructor + student) ───────────────────────────────────────
router.get('/:quizId', authMiddleware, getQuizByIdController);

export default router;
