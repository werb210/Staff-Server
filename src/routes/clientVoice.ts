// BF_SERVER_BLOCK_53_v1 -- client mini-portal voice token endpoint.
// Identity scheme: `client-<applicationId>`. This lets the TwiML
// webhook distinguish client-initiated calls from staff-initiated
// calls and route the former to staff via <Dial><Client>...</Client>.
//
// Auth: matches the other /api/client/* endpoints (which are roles:[]
// in routeRegistry, so accept the client OTP JWT or no JWT). We do
// not require auth here for parity with /api/client/messages. The
// identity is derived from the applicationId path parameter, which
// the client already knows.
import { Router, type Request, type Response } from "express";
import { generateVoiceToken } from "../telephony/services/tokenService.js";

const router = Router();

router.get("/token", async (req: Request, res: Response) => {
  const applicationId = typeof req.query.applicationId === "string" ? req.query.applicationId.trim() : "";
  if (!applicationId) {
    return res.status(400).json({ error: "applicationId is required" });
  }
  // Reject anything that doesn't look like an application id.
  if (!/^[A-Za-z0-9._\-:]{6,128}$/.test(applicationId)) {
    return res.status(400).json({ error: "invalid applicationId" });
  }
  const missingEnv = ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_VOICE_APP_SID"].filter((k) => !process.env[k]);
  if (missingEnv.length > 0) {
    return res.status(503).json({ error: "telephony_not_configured", missing: missingEnv });
  }
  try {
    const identity = `client-${applicationId}`;
    const token = generateVoiceToken(identity);
    return res.status(200).json({ token, identity });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "token_generation_failed" });
  }
});

export default router;
