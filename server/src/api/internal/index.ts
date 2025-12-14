import { Router } from "express";
import dbRoutes from "./db";

const router = Router();

router.use(dbRoutes);

export default router;
