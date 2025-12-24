import { Router } from "express";
import { verifySms } from "../api/auth/verify-sms.js";
import { refreshToken } from "../api/auth/refresh-token.js";

const router = Router();

router.post("/verify-sms", verifySms);
router.post("/refresh-token", refreshToken);

export default router;
