import { Router } from "express";
import applicationRoutes from "../modules/applications/applications.routes";

const router = Router();
router.use("/", applicationRoutes);

export default router;
