import { Router } from "express";
import {
  getPipeline,
  moveCard,
} from "../controllers/pipelineController.js";

const router = Router();

router.get("/:silo", getPipeline);
router.post("/:silo/:appId/move", moveCard);

export default router;
