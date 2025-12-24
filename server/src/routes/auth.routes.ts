import { Router } from "express";
import { verifySms } from "../api/auth/verify-sms.js";

const router = Router();

router.post("/verify-sms", verifySms);

export default router;
