// -----------------------------------------------------
// Silo-scoped application routes
// Mounted at: /api/:silo/applications
// -----------------------------------------------------

import { Router, Request, Response, NextFunction } from "express";
import {
  getApplications,
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../controllers/applicationsController.js";

// Router inherits :silo from parent (/api/:silo)
const router = Router({ mergeParams: true });

// -----------------------------------------------------
// Async wrapper (strict TS)
// -----------------------------------------------------
const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// -----------------------------------------------------
// Validate appId param
// -----------------------------------------------------
router.param(
  "appId",
  (req: Request, res: Response, next: NextFunction, value: string) => {
    if (!value || typeof value !== "string" || value.length < 8) {
      return res.status(400).json({
        ok: false,
        error: "Invalid application ID",
        received: value,
      });
    }
    next();
  }
);

// -----------------------------------------------------
// ROUTES
// -----------------------------------------------------
router.get("/", wrap(getApplications));
router.post("/", wrap(createApplication));
router.get("/:appId", wrap(getApplicationById));
router.put("/:appId", wrap(updateApplication));
router.delete("/:appId", wrap(deleteApplication));

export default router;
