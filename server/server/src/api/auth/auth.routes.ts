import { Router } from "express";
import { login } from "./login.js";
import { refreshToken } from "./refresh-token.js";
import { register } from "./register.js";
import { verifySms } from "./verify-sms.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/verify-sms", verifySms);
router.post("/refresh-token", refreshToken);

export default router;
