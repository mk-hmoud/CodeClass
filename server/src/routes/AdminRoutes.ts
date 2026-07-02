import { Router } from 'express';
import { createUser, getAllUsers, deleteUser } from '../controllers/AdminController';
import { authMiddleware, requireRole } from '../middleware/AuthMiddleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['admin']));

router.post('/users', createUser);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

export default router;
