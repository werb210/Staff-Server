import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import authRoutes from "./auth.routes";
import applicationRoutes from "./applications.routes";
import crmRoutes from "./crm.routes";
import taskRoutes from "./tasks.routes";
import lenderRoutes from "./lenders.routes";

const router = Router();

router.use("/auth", authRoutes);

router.use(requireAuth);
router.use("/applications", applicationRoutes);
router.use("/crm", crmRoutes);
router.use("/tasks", taskRoutes);
router.use("/lenders", lenderRoutes);

export default router;
