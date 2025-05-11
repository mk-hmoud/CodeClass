import { Router } from 'express';
import { createClassroomController, getClassroomByIdController, getClassroomsController, assignAssignmentController, deleteClassroomController, joinClassroomController, toggleClassroomStatusController} from '../controllers/ClassroomController';
import { getClassroomAnalyticsController } from '../controllers/AnalyticsController';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { join } from 'path';

const router = Router();

router.post('/join', authMiddleware, joinClassroomController)
router.post('/', authMiddleware, createClassroomController);
router.get('/classrooms', authMiddleware, getClassroomsController);
router.get('/:classroomId', authMiddleware, getClassroomByIdController);
router.get('/:classroomId/analytics', authMiddleware, getClassroomAnalyticsController);
router.post('/assign', assignAssignmentController);
router.delete('/:classroomId', authMiddleware, deleteClassroomController);
router.post('/:classId/toggle-status', toggleClassroomStatusController);

export default router;
