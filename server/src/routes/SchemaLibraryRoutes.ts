import { Router } from "express";
import {
  createSchemaLibraryController,
  getSchemaLibrariesController,
  getSchemaLibraryByIdController,
  updateSchemaLibraryController,
  deleteSchemaLibraryController,
} from "../controllers/SchemaLibraryController";
import { authMiddleware, requireRole } from "../middleware/AuthMiddleware";

const router = Router();

router.use(authMiddleware, requireRole(["instructor"]));

router.post("/", createSchemaLibraryController);
router.get("/", getSchemaLibrariesController);
router.get("/:schemaLibraryId", getSchemaLibraryByIdController);
router.put("/:schemaLibraryId", updateSchemaLibraryController);
router.delete("/:schemaLibraryId", deleteSchemaLibraryController);

export default router;
