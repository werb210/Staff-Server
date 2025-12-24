import { Router } from "express";
import { login } from "./login.js";
import { refreshToken } from "./refresh-token.js";

const router = Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);

export default router;
