import Twilio from "twilio";
import { requireEnv } from "../env.js";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
} = process.env;

export const twilioConfigured =
  !!TWILIO_ACCOUNT_SID &&
  !!TWILIO_AUTH_TOKEN &&
  !!TWILIO_VERIFY_SERVICE_SID;

let client: ReturnType<typeof Twilio> | null = null;

function getTwilioClient() {
  if (client) {
    return client;
  }

  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  client = Twilio(accountSid, authToken);

  return client;
}

function getVerifyServiceSid(): string {
  return requireEnv("TWILIO_VERIFY_SERVICE_SID");
}

export function sendVerificationCode(to: string) {
  return getTwilioClient()
    .verify.v2.services(getVerifyServiceSid())
    .verifications.create({ to, channel: "sms" });
}

export function checkVerificationCode(to: string, code: string) {
  return getTwilioClient()
    .verify.v2.services(getVerifyServiceSid())
    .verificationChecks.create({ to, code });
}
