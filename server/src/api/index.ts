import { Router } from "express";
import internalRoutes from "./_int/index.js";
import authRoutes from "./auth/auth.routes.js";
import crmRoutes from "./crm/index.js";
import usersRoutes from "./users/index.js";

const router = Router();

router.use("/_int", internalRoutes);
router.use("/auth", authRoutes);
router.use("/crm", crmRoutes);
router.use("/users", usersRoutes);

export default router;
