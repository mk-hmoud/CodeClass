import { Router } from 'express';
import { createAssignmentController, getAssignmentsController, getAssignmentByIdController, deleteAssignmentController, getRemainingAttemptsController } from '../controllers/AssignmentController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';

const router = Router();
//router.use(requireRole(["instructor"]));

router.post('/', authMiddleware, createAssignmentController);
router.get('/assignments', authMiddleware, getAssignmentsController);
router.get('/:assignmentId', authMiddleware, getAssignmentByIdController);
router.get('/:assignmentId/remaining-attempts', authMiddleware, getRemainingAttemptsController);
router.delete('/:assignmentId', deleteAssignmentController);

export default router;
