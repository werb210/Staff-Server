import { Router } from "express";
import { login, logout, refresh } from "./auth.routes";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);

export default router;
