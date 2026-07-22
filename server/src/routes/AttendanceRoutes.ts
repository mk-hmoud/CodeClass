import { Router } from "express";
import {
  findOrCreateSessionController,
  saveAttendanceController,
  listSessionsController,
  getAttendanceReportController,
} from "../controllers/AttendanceController";
import { authMiddleware, requireRole } from "../middleware/AuthMiddleware";

const router = Router();

router.use(authMiddleware, requireRole(["instructor"]));

router.post("/sessions", findOrCreateSessionController);
router.put("/sessions/:sessionId", saveAttendanceController);
router.get("/classrooms/:classroomId/sessions", listSessionsController);
router.get("/report/:assignmentId", getAttendanceReportController);

export default router;
