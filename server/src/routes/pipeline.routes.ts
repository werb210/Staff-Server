// server/src/routes/pipeline.routes.ts
import { Router } from "express";
import { pipelineController } from "../controllers/pipelineController.js";

const router = Router();

router.get("/", pipelineController.list);
router.get("/:id", pipelineController.get);
router.post("/", pipelineController.create);
router.put("/:id", pipelineController.update);
router.delete("/:id", pipelineController.remove);

export default router;
