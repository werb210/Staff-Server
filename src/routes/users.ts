import { Router } from "express";
import usersRoutes from "../modules/users/users.routes";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.USER_MANAGE]));
router.use("/", usersRoutes);

export default router;
