import { Router } from "express";
import Twilio from "twilio";
import { logError } from "../observability/logger";

const router = Router();

type TwilioErrorDetails = {
  code?: number | string;
  status?: number;
  message: string;
};

function getTwilioErrorDetails(error: unknown): TwilioErrorDetails {
  if (error && typeof error === "object") {
    const err = error as {
      code?: unknown;
      status?: unknown;
      message?: unknown;
    };
    return {
      code:
        typeof err.code === "number" || typeof err.code === "string"
          ? err.code
          : undefined,
      status: typeof err.status === "number" ? err.status : undefined,
      message:
        typeof err.message === "string"
          ? err.message
          : "Twilio debug check failed",
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Twilio debug check failed" };
}

router.get("/twilio", async (_req, res) => {
  // TEMPORARY DEBUG: disable in production. Post-deploy manual test:
  // curl https://api.staff.boreal.financial/api/_debug/twilio
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  const requiredKeys = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID",
  ];
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    res.status(500).json({ ok: false, error: "missing_env", missing });
    return;
  }

  try {
    const client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const account = await client.api
      .accounts(process.env.TWILIO_ACCOUNT_SID!)
      .fetch();
    const service = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .fetch();
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.list({ limit: 1 });

    res.json({
      ok: true,
      accountSid: account.sid,
      verifyServiceSid: service.sid,
      accountStatus: account.status,
      serviceStatus: service.status,
    });
  } catch (error: unknown) {
    const details = getTwilioErrorDetails(error);
    logError("twilio_debug_failed", {
      code: details.code,
      status: details.status,
      message: details.message,
    });
    res.status(500).json({
      ok: false,
      error: "twilio_debug_failed",
      message: details.message,
      code: details.code,
      status: details.status,
    });
  }
});

export default router;
