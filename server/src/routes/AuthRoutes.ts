import { Router } from 'express';
import { signup, login, studentAccess, validateToken } from '../controllers/AuthController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/student-access', studentAccess);
router.get('/validate-token', validateToken);

export default router;
