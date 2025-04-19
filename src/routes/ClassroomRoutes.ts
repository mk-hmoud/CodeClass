import { Router } from 'express';
import { createClassroomController, getClassroomByIdController, getClassroomsController, assignAssignmentController, deleteClassroomController, joinClassroomController} from '../controllers/ClassroomController';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { join } from 'path';

const router = Router();

router.post('/join', authMiddleware, joinClassroomController)
router.post('/', authMiddleware, createClassroomController);
router.get('/classrooms', authMiddleware, getClassroomsController);
router.get('/:classroomId', authMiddleware, getClassroomByIdController);
router.post('/assign', assignAssignmentController);
router.delete('/:classroomId', authMiddleware, deleteClassroomController);

export default router;
