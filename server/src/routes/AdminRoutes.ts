import { Router } from 'express';
import { createUser, getAllUsers, deleteUser, getAllClassrooms, deleteClassroom, getAnalytics, changeUserPassword, bulkCreateUsers } from '../controllers/AdminController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['admin']));

router.post('/users', createUser);
router.post('/users/bulk', bulkCreateUsers);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/password', changeUserPassword);

router.get('/classrooms', getAllClassrooms);
router.delete('/classrooms/:id', deleteClassroom);
router.get('/analytics', getAnalytics);

export default router;
