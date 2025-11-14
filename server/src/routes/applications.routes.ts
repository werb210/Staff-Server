import { Router } from "express";
import {
  fetchApplication,
  fetchApplicationsForSilo,
  changeApplicationStage,
} from "../controllers/applications/applicationController.js";

const router = Router();

// /applications/silo/BF
router.get("/silo/:silo", fetchApplicationsForSilo);

// /applications/:id
router.get("/:id", fetchApplication);

// /applications/:id/stage
router.post("/:id/stage", changeApplicationStage);

export default router;
