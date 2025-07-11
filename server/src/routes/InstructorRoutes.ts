import { Router } from 'express';
import { createInstructorController, getInstructorByUserIdController, getInstructorByIdController } from '../controllers/InstructorController';

const router = Router();

router.post('/', createInstructorController);
router.get('/user/:userId', getInstructorByUserIdController);
router.get('/:instructorId', getInstructorByIdController);

export default router;
