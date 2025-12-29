import { Router } from "express";
import { login, logout, me, refresh, status } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

const router = Router();

router.get("/status", status);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);

export default router;
