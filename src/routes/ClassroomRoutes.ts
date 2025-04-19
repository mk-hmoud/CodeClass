import { Router } from 'express';
import { createClassroomController, getClassroomByIdController, getClassroomsController, assignAssignmentController, deleteClassroomController } from '../controllers/ClassroomController';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

router.post('/', authMiddleware, createClassroomController);
router.get('/classrooms', authMiddleware, getClassroomsController);
router.get('/:classroomId', authMiddleware, getClassroomByIdController);
router.post('/assign', assignAssignmentController);
router.delete('/:classroomId', authMiddleware, deleteClassroomController);

export default router;
