import { Router } from "express";
import { authController, me } from "./auth.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.post("/login", authController.login);
router.get("/me", requireAuth, me);

export default router;
