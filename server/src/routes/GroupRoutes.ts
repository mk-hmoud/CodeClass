import { Router } from "express";
import {
  createGroupController,
  getGroupsController,
  updateGroupController,
  deleteGroupController,
  setGroupRosterController,
} from "../controllers/GroupController";
import { authMiddleware, requireRole } from "../middleware/AuthMiddleware";

const router = Router();

router.use(authMiddleware, requireRole(["instructor"]));

router.post("/", createGroupController);
router.get("/", getGroupsController);
router.put("/:groupId", updateGroupController);
router.delete("/:groupId", deleteGroupController);
router.put("/:groupId/roster", setGroupRosterController);

export default router;
