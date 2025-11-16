// server/src/routes/applications.routes.ts
import { Router } from "express";

// Controllers (tsc will output .js in dist/)
import {
  createApplication,
  getApplicationById,
  updateApplication,
  listApplications,
  deleteApplication,
} from "../controllers/applicationsController.js";

const router = Router();

/**
 * ----------------------------------------------------
 * APPLICATION ROUTES
 * ----------------------------------------------------
 * These routes handle CRUD operations for funding applications.
 */

// GET /applications
router.get("/", listApplications);

// POST /applications
router.post("/", createApplication);

// GET /applications/:id
router.get("/:id", getApplicationById);

// PUT /applications/:id
router.put("/:id", updateApplication);

// DELETE /applications/:id
router.delete("/:id", deleteApplication);

export default router;
