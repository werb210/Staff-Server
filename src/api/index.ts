import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { requestContext } from "../middleware/requestContext";
import { notFoundHandler, errorHandler } from "../middleware/errors";

const router = Router();

// 🔴 CONTEXT MOUNTED HERE (NOT index.ts)
router.use(requestContext);

// ---- ROUTES ----
router.use("/auth", authRoutes);

// ---- FALLTHROUGHS ----
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
