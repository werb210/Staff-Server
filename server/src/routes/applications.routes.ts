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
} from "../controllers/index.js";

// Router inherits :silo from parent (/api/:silo)
const router = Router({ mergeParams: true });

// -----------------------------------------------------
// Strict async wrapper
// -----------------------------------------------------
type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const wrap =
  (fn: AsyncRouteHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };

// -----------------------------------------------------
// Validate :appId param (strict TS signature)
// -----------------------------------------------------
router.param(
  "appId",
  (
    req: Request,
    res: Response,
    next: NextFunction,
    value: string
  ): void => {
    if (!value || typeof value !== "string" || value.length < 8) {
      res.status(400).json({
        ok: false,
        error: "Invalid application ID",
        received: value,
      });
      return;
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
