// src/api/index.ts
import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { notFoundHandler, errorHandler } from "../middleware/errors";

const router = Router();

// ---- API ROUTES ----
router.use("/auth", authRoutes);

// ---- FALLTHROUGHS ----
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
