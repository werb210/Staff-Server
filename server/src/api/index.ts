import { Router } from "express";
import authRoutes from "./auth/index.js";
import userRoutes from "./users/index.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

export default router;
