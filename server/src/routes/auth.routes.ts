import { randomUUID } from "crypto";
import { Router } from "express";

import { db } from "../db/index.js";
import {
  checkVerificationCode,
  sendVerificationCode,
  twilioConfigured
} from "../services/twilio.service.js";
import { signAccessToken, verifyAccessToken } from "../services/jwt.service.js";
import { hashPassword, verifyPassword } from "../services/password.service.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const existingUser = db.users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  db.users.push({ id: userId, email, passwordHash });

  const accessToken = signAccessToken({ userId, email });

  return res.status(201).json({ userId, accessToken });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = db.users.find((u) => u.email === email);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });

  return res.json({ accessToken });
});

router.post("/refresh-token", (req, res) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const payload = verifyAccessToken(token);
    const accessToken = signAccessToken(payload);
    return res.json({ accessToken });
  } catch (error) {
    console.error("Refresh token validation failed", error);
    return res.status(401).json({ message: "Invalid token" });
  }
});

router.post("/verify-sms", async (req, res) => {
  const { phone, code } = req.body as { phone?: string; code?: string };

  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  if (!twilioConfigured) {
    return res.status(503).json({ message: "SMS verification is not configured" });
  }

  try {
    if (!code) {
      await sendVerificationCode(phone);
      return res.json({ sent: true });
    }

    const approved = await checkVerificationCode(phone, code);
    return res.json({ approved });
  } catch (error) {
    console.error("SMS verification failed", error);
    return res.status(500).json({ message: "Verification failed" });
  }
});

export default router;
