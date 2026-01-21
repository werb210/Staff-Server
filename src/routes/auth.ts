import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { notFoundHandler } from "../middleware/errors";
import { errorHandler } from "../middleware/errorHandler";

const router = Router();
router.use("/", authRoutes);
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
