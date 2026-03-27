import { storeOtp as persistOtp } from "../services/otpService";
import { config } from "../config";
import twilio from "twilio";

if (
  !process.env.TWILIO_ACCOUNT_SID
  || !process.env.TWILIO_AUTH_TOKEN
  || !process.env.TWILIO_VERIFY_SERVICE_SID
) {
  throw new Error("Missing Twilio config");
}

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const verifyServiceSid =
  process.env.TWILIO_VERIFY_SERVICE_SID!;

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "1" + p;
  if (!p.startsWith("1")) throw new Error("Invalid phone");
  return `+${p}`;
}

export async function sendOtp(phone: string): Promise<string> {
  if (config.app.testMode === "true") {
    return "000000";
  }

  const normalized = normalizePhone(phone);
  await twilioClient.verify.v2
    .services(verifyServiceSid)
    .verifications.create({
      to: normalized,
      channel: "sms",
    });

  return "sent";
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const normalized = normalizePhone(phone);

  await persistOtp(normalized, code);

  console.log("[OTP SEND]", normalized, code);
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (config.app.testMode === "true") {
    return code === "000000" ? { ok: true } : { ok: false, error: "invalid_code" };
  }

  const normalized = normalizePhone(phone);
  const result = await twilioClient.verify.v2
    .services(verifyServiceSid)
    .verificationChecks.create({
      to: normalized,
      code,
    });

  if (result.status !== "approved") {
    throw new Error("Invalid OTP");
  }

  return { ok: true };
}
