import { Router } from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { validateAssignment } from '../middleware/AssignmentMiddleware';
import { 
  exportCSVHandler, 
  exportExcelHandler, 
  exportJSONHandler, 
  exportPDFHandler, 
  exportXMLHandler, 
  exportZIPHandler 
} from '../services/export/Exporter';

const router = Router();

router.post('/:assignmentId/csv', authMiddleware, validateAssignment, exportCSVHandler);
router.post('/:assignmentId/json', authMiddleware, validateAssignment, exportJSONHandler);
router.post('/:assignmentId/xml', authMiddleware, validateAssignment, exportXMLHandler);
router.post('/:assignmentId/zip', authMiddleware, validateAssignment, exportZIPHandler);
router.post('/:assignmentId/excel', authMiddleware, validateAssignment, exportExcelHandler);
router.post('/:assignmentId/pdf', authMiddleware, validateAssignment, exportPDFHandler);

export default router;