import { Router } from "express";

import authRoutes from "./auth";
import internalRoutes from "./internal.routes";
import publicRoutes from "./public.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/internal", internalRoutes);
router.use("/public", publicRoutes);

export default router;
