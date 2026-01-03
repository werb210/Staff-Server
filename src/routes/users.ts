import { Router } from "express";
import usersRoutes from "../modules/users/users.routes";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.use(requireRole("admin"));
router.use("/", usersRoutes);

export default router;
