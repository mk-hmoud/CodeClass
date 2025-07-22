import { Router } from "express";
import {
  createProblemController,
  getProblemsController,
  getProblemByIdController,
  updateProblemController,
  deleteProblemController,
} from "../controllers/ProblemController";
import { authMiddleware, requireRole } from "../middleware/AuthMiddleware";

const router = Router();

router.use(authMiddleware, requireRole(["instructor"]));

router.post("/", createProblemController);
router.get("/", getProblemsController);
router.get("/:problemId", getProblemByIdController);
router.put("/:problemId", updateProblemController);
router.delete("/:problemId", deleteProblemController);

export default router;
