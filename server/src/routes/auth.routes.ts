import { Router } from "express";
import { refreshToken } from "../api/auth/refresh-token";
import { login } from "../api/auth/login";

const router = Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);

export default router;
