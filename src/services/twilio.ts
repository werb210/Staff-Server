import Twilio from "twilio";
import { env } from "../env";

let cachedClient: Twilio.Twilio | null = null;

export function getTwilioClient(): Twilio.Twilio {
  if (cachedClient) return cachedClient;

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials missing");
  }

  cachedClient = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return cachedClient;
}

export function getTwilioVerifyServiceSid(): string {
  if (!env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("Twilio Verify Service SID missing");
  }
  return env.TWILIO_VERIFY_SERVICE_SID;
}

export async function sendOtp(
  client: Twilio.Twilio,
  serviceSid: string,
  phoneE164: string
) {
  return client.verify.v2
    .services(serviceSid)
    .verifications.create({
      to: phoneE164,
      channel: "sms",
    });
}

export async function checkOtp(
  client: Twilio.Twilio,
  serviceSid: string,
  phoneE164: string,
  code: string
) {
  // CRITICAL FIX:
  // verificationChecks (plural) is the ONLY valid endpoint
  return client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({
      to: phoneE164,
      code,
    });
}
