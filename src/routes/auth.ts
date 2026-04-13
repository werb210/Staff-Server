import { Router } from "express";
import jwt from "jsonwebtoken";
import twilio from "twilio";

const router = Router();
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  console.error("❌ Twilio ENV missing");
}

if (TWILIO_VERIFY_SERVICE_SID && !TWILIO_VERIFY_SERVICE_SID.startsWith("VA")) {
  console.error("❌ Invalid Twilio Verify SID. Expected SID to start with VA.");
}

const client: any = twilio(TWILIO_ACCOUNT_SID ?? "", TWILIO_AUTH_TOKEN ?? "");

// START OTP
router.post("/otp/start", async (req, res) => {
  console.log("🔥 OTP START HIT");
  console.log("📞 Incoming body:", req.body);

  try {
    const { phone } = req.body;

    if (!phone) {
      console.error("❌ No phone provided");
      return res.status(400).json({ error: "Phone required" });
    }

    if (!TWILIO_VERIFY_SERVICE_SID) {
      console.error("❌ Missing TWILIO_VERIFY_SERVICE_SID");
      return res.status(500).json({
        error: "OTP failed",
        details: "TWILIO_VERIFY_SERVICE_SID is not configured",
      });
    }

    console.log("➡️ Sending OTP via Twilio...");
    console.log("Using Verify SID:", TWILIO_VERIFY_SERVICE_SID);

    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    console.log("✅ Twilio response:", verification.status);

    return res.json({
      success: true,
      status: verification.status,
    });
  } catch (err: any) {
    console.error("❌ OTP ERROR:", err.message);
    console.error(err);

    return res.status(500).json({
      error: "OTP failed",
      details: err.message,
    });
  }
});

// VERIFY OTP
router.post("/otp/verify", async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: "Phone and code are required" });
  }

  const store = globalThis.__otpStore ?? {};
  const record = store[phone];

  if (!record) {
    return res.status(401).json({ error: "Invalid code" });
  }

  if (record.code !== code) {
    return res.status(401).json({ error: "Invalid code" });
  }

  record.verified = true;

  return res.status(200).json({
    status: "ok",
    data: {
      token: "test-token",
    },
  });
});

router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ error: "missing token" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "auth not configured" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { phone?: string; role?: string };

    return res.status(200).json({
      user: {
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
  globalThis.__otpStore = {};
}
