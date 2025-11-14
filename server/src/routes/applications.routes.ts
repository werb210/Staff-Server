import { Router } from "express";
import {
  getApplications,
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../controllers/applicationsController.js";

const router = Router({ mergeParams: true });

router.get("/", getApplications);
router.post("/", createApplication);
router.get("/:appId", getApplicationById);
router.put("/:appId", updateApplication);
router.delete("/:appId", deleteApplication);

export default router;
