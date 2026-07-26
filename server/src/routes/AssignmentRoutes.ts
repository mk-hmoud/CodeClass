import { Router } from 'express';
import { createAssignmentController, getAssignmentsController, getAssignmentByIdController, deleteAssignmentController, getRemainingAttemptsController, getUpcomingDeadlinesController, getMySubmissionController, releaseGradesController } from '../controllers/AssignmentController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';
import { getAssignmentAnalyticsController } from '../controllers/AnalyticsController';
import { getAssignmentPlagiarismReportsController } from '../controllers/PlagiarismController';

const router = Router();
//router.use(requireRole(["instructor"]));

router.post('/', authMiddleware, createAssignmentController);
router.get('/upcoming-deadlines', authMiddleware, getUpcomingDeadlinesController);
router.get('/assignments', authMiddleware, getAssignmentsController);
router.get('/:assignmentId', authMiddleware, getAssignmentByIdController);
router.get('/:assignmentId/remaining-attempts', authMiddleware, getRemainingAttemptsController);
router.get('/:assignmentId/my-submission', authMiddleware, getMySubmissionController);
router.post('/:assignmentId/release-grades', authMiddleware, releaseGradesController);
router.get('/:assignmentId/analytics', authMiddleware, getAssignmentAnalyticsController);
router.delete('/:assignmentId', deleteAssignmentController);
router.get('/:assignmentId/plagiarism', authMiddleware, getAssignmentPlagiarismReportsController);
export default router;
