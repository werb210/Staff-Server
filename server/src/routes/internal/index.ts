import { Router } from "express";
import healthRouter from "./health";
import dbRouter from "./db";

const router = Router();

router.use("/health", healthRouter);
router.use("/db", dbRouter);

export default router;r;
