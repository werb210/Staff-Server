import { Router } from "express";
import { login, logout, refresh, me, status } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);
router.get("/status", status);

export default router;
