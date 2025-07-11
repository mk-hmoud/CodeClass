import { Router } from 'express';
import { createStudentController, getStudentByUserIdController, getStudentByIdController } from '../controllers/StudentController';

const router = Router();

router.post('/', createStudentController);
router.get('/user/:userId', getStudentByUserIdController);
router.get('/:studentId', getStudentByIdController);

export default router;
