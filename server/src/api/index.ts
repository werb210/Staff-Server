import { Router } from "express";
import usersRouter from "./users/index.js";
import authRoutes from "../routes/auth.routes.js";

const router = Router();

router.use("/users", usersRouter);
router.use("/auth", authRoutes);

export default router;
