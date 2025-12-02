// server/src/routes/deals.routes.ts
import { Router } from "express";
import dealsController from "../controllers/dealsController.js";

const router = Router();

// Only match() exists
router.get("/:applicationId", dealsController.match);

export default router;
