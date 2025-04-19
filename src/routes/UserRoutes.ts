import { Router } from 'express';
import { createUserController, getUserByIdController, deleteUserController } from '../controllers/UserController';

const router = Router();

router.post('/', createUserController);
router.get('/:userId', getUserByIdController);
router.delete('/:userId', deleteUserController);

export default router;
