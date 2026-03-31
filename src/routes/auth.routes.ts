import { Router } from "express";

import { signJwt, verifyJwt } from "../auth/jwt";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json(req.user);
});

router.post("/start-otp", (req, res) => {
  const { phone } = req.body || {};

  if (!phone || typeof phone !== "string" || phone.length < 6) {
    return res.status(400).json({ error: "INVALID_PHONE" });
  }

  return res.status(200).json({ success: true });
});

router.post("/verify-otp", (req, res) => {
  const { phone, code } = req.body || {};

  if (!phone || !code) {
    return res.status(400).json({ error: "INVALID_INPUT" });
  }

  if (code !== "123456") {
    return res.status(400).json({ error: "INVALID_CODE" });
  }

  const token = signJwt({ phone });

  return res.status(200).json({ token });
});

router.post("/refresh", (req, res) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  const token = header.split(" ")[1];

  try {
    verifyJwt(token);
    return res.status(200).json({ success: true });
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
});

export default router;
