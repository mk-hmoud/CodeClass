import { Router } from 'express';
import { login, validateToken, changeOwnPassword } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

router.post('/login', login);
router.get('/validate-token', validateToken);
router.post('/change-password', authMiddleware, changeOwnPassword);

export default router;
