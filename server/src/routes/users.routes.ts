import { Router } from "express";

import { authController } from "../auth/auth.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/me", requireAuth, authController.me);

export default router;
