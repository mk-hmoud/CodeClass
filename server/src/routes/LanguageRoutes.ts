import { Router } from 'express';
import { getLanguagesController } from '../controllers/LanguageController';

const router = Router();

router.get('/languages', getLanguagesController);

export default router;
