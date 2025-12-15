import { Router } from "express";
import { authController } from "./auth.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);

export default router;
