import { Router } from "express";
import dbRoutes from "./db";
import healthRoutes from "./health";

const router = Router();

router.use("/db", dbRoutes);
router.use("/health", healthRoutes);

export default router;
