import { Router } from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { validateAssignment } from '../middleware/AssignmentMiddleware';
import { 
  exportCSVHandler, 
  exportJSONHandler, 
  exportXMLHandler, 
  exportZIPHandler 
} from '../services/export/Exporter';

const router = Router();

router.post('/:assignmentId/csv', authMiddleware, validateAssignment, exportCSVHandler);
router.post('/:assignmentId/json', authMiddleware, validateAssignment, exportJSONHandler);
router.post('/:assignmentId/xml', authMiddleware, validateAssignment, exportXMLHandler);
router.post('/:assignmentId/zip', authMiddleware, validateAssignment, exportZIPHandler);

export default router;