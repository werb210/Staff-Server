import { Router } from "express";

import authRoutes from "./auth";
import internalRoutes from "./internal.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/internal", internalRoutes);

export default router;
