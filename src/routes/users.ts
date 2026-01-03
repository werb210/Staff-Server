import { Router } from "express";
import usersRoutes from "../modules/users/users.routes";
import { requireAuth, requireRole } from "../middleware/auth";
import { permissions } from "../auth/roles";

const router = Router();

router.use(requireAuth);
router.use(requireRole(permissions.userAdmin));
router.use("/", usersRoutes);

export default router;
