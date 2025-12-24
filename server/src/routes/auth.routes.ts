import { Router } from "express";
import { refreshToken } from "../api/auth/refresh-token.js";
import { verifySms } from "../api/auth/verify-sms.js";

const router = Router();

router.post("/refresh-token", refreshToken);
router.post("/verify-sms", verifySms);

export default router;
