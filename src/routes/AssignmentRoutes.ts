import { Router } from 'express';
import { createAssignmentController, getAssignmentsController, getAssignmentByIdController, deleteAssignmentController } from '../controllers/AssignmentController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';

const router = Router();
//router.use(requireRole(["instructor"]));

router.post('/', authMiddleware, createAssignmentController);
router.get('/assignments', authMiddleware, getAssignmentsController);
router.get('/:assignmentId', getAssignmentByIdController);
router.delete('/:assignmentId', deleteAssignmentController);

export default router;
