import { Router } from "express";
import { login } from "../api/auth/login.js";
import { refreshToken } from "../api/auth/refresh-token.js";

const router = Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);

export default router;
