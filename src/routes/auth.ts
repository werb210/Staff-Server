import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * TEST STORE
 */
const otpStore = new Map<
  string,
  { code: string; attempts: number; verified: boolean; createdAt: number }
>();

/**
 * START OTP
 */
router.post("/otp/start", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: "phone required" });
  }

  otpStore.set(phone, {
    code: "654321",
    attempts: 0,
    verified: false,
    createdAt: Date.now(),
  });

  // TODO: your Twilio logic here
  console.log("OTP START:", phone);

  return res.status(200).json({ success: true });
});

/**
 * VERIFY OTP
 */
router.post("/otp/verify", async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, error: "missing fields" });
  }

  otpStore.delete(phone);

  // TODO: verify logic
  return res.status(200).json({
    success: true,
    token: "mock-token",
  });
});

/**
 * ME
 */
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ error: "missing token" });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ error: "auth not configured" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { phone?: string; role?: string };

    // Prefer real user record from DB; fall back to claims if unavailable.
    let user: { id: string; phone: string; role: string; email?: string } | null = null;
    try {
      const { runQuery } = await import("../db.js");
      const result = await runQuery<{
        id: string;
        phone: string;
        role: string;
        email?: string;
      }>(
        "SELECT id, phone, role, email FROM users WHERE phone = $1 LIMIT 1",
        [decoded.phone],
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } catch {
      // DB unavailable or user not seeded — use token claims.
    }

    return res.status(200).json({
      user: user ?? {
        id: decoded.phone ?? "unknown",
        phone: decoded.phone ?? "",
        role: decoded.role ?? "Staff",
      },
    });
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
});

export default router;

export function resetOtpStateForTests() {
  otpStore.clear();
}
