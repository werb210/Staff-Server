import { Router } from "express";
import {
  getApplications,
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../controllers/applicationsController.js";

const router = Router();

router.get("/:silo", getApplications);
router.post("/:silo", createApplication);
router.get("/:silo/:appId", getApplicationById);
router.put("/:silo/:appId", updateApplication);
router.delete("/:silo/:appId", deleteApplication);

export default router;
