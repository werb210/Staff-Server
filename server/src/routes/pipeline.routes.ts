import { Router } from "express";
import {
  fetchPipeline,
  changeCardStage,
} from "../controllers/pipeline/pipelineController.js";

const router = Router();

// /pipeline/silo/BF
router.get("/silo/:silo", fetchPipeline);

// /pipeline/card/:cardId/stage
router.post("/card/:cardId/stage", changeCardStage);

export default router;
