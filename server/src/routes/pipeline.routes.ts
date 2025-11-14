import { Router } from "express";
import { getPipeline, moveCard } from "../controllers/pipelineController.js";

const router = Router({ mergeParams: true });

router.get("/", getPipeline);
router.post("/move/:appId", moveCard);

export default router;
