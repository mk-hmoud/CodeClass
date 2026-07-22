import { Router } from "express";
import {
  createLibraryController,
  getLibrariesController,
  getLibraryByIdController,
  updateLibraryController,
  deleteLibraryController,
} from "../controllers/LibraryController";
import { authMiddleware, requireRole } from "../middleware/AuthMiddleware";

const router = Router();

router.use(authMiddleware, requireRole(["instructor"]));

router.post("/", createLibraryController);
router.get("/", getLibrariesController);
router.get("/:libraryId", getLibraryByIdController);
router.put("/:libraryId", updateLibraryController);
router.delete("/:libraryId", deleteLibraryController);

export default router;
