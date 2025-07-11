import { Router } from 'express';
import { signup, login, validateToken } from '../controllers/AuthController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/validate-token', validateToken);

export default router;
