import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * TEMP IN-MEM STORE (REPLACE WITH DB LATER)
 */
const otpStore = new Map<string, string>();

/**
 * START OTP
 * POST /api/auth/otp/start
 */
router.post("/otp/start", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ status: "error", message: "Phone is required" });
  }

  const code = "123456"; // TEMP (replace with Twilio)

  otpStore.set(phone, code);

  return res.json({ status: "ok", data: { sent: true } });
});

/**
 * VERIFY OTP
 * POST /api/auth/otp/verify
 */
router.post("/otp/verify", (req, res) => {
  const { phone, code } = req.body;

  const stored = otpStore.get(phone);

  if (!stored || stored !== code) {
    return res.status(401).json({ status: "error", message: "Invalid code" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ status: "error", message: "JWT secret is not configured" });
  }

  otpStore.delete(phone);

  const token = jwt.sign({ id: phone, phone }, jwtSecret, { expiresIn: "7d" });

  return res.json({
    status: "ok",
    data: {
      token,
      user: {
        id: phone,
        phone,
      },
    },
  });
});

/**
 * GET CURRENT USER
 */
router.get("/me", (req, res) => {
  const auth = req.headers.authorization?.split(" ")[1];
  if (!auth) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ status: "error", message: "JWT secret is not configured" });
  }

  try {
    const user = jwt.verify(auth, jwtSecret);
    return res.json({ status: "ok", data: { user } });
  } catch {
    return res.status(401).json({ status: "error", message: "Invalid token" });
  }
});

export default router;
