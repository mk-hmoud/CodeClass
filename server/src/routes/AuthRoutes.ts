import { Router } from 'express';
import { login, validateToken } from '../controllers/AuthController';

const router = Router();

router.post('/login', login);
router.get('/validate-token', validateToken);

export default router;
