import { Router } from "express";
import usersRoutes from "../modules/users/users.routes";
import { requireAuth, requireRole } from "../middleware/auth";
import { ROLES } from "../auth/roles";

const router = Router();

router.use(requireAuth);
router.use(requireRole([ROLES.ADMIN]));
router.use("/", usersRoutes);

export default router;
