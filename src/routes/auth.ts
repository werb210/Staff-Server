import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { errorHandler, notFoundHandler } from "../middleware/errors";

const router = Router();
router.use("/", authRoutes);
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
