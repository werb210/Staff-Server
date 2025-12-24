import { Router } from "express";
import { login } from "../api/auth/login";
import { refreshToken } from "../api/auth/refresh-token";

const router = Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);

export default router;
