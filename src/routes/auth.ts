import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { requireAuth } from "../middleware/requireAuth";
import { notFoundHandler } from "../middleware/errors";
import { errorHandler } from "../middleware/errorHandler";
import { authMeHandler } from "./auth/me";

const router = Router();
router.get("/me", requireAuth, authMeHandler);
router.use("/", authRoutes);
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
