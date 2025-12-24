import { Router } from "express";
import usersRouter from "./users/index.js";
import authRouter from "./auth/index.js";

const router = Router();

router.use("/users", usersRouter);
router.use("/auth", authRouter);

export default router;
