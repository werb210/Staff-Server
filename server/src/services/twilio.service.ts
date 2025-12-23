import Twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
} = process.env;

export const twilioConfigured =
  !!TWILIO_ACCOUNT_SID &&
  !!TWILIO_AUTH_TOKEN &&
  !!TWILIO_VERIFY_SERVICE_SID;

if (!twilioConfigured) {
  throw new Error("Twilio environment variables are missing");
}

const client = Twilio(
  TWILIO_ACCOUNT_SID as string,
  TWILIO_AUTH_TOKEN as string
);

export function sendVerificationCode(to: string) {
  return client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID as string)
    .verifications.create({ to, channel: "sms" });
}

export function checkVerificationCode(to: string, code: string) {
  return client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID as string)
    .verificationChecks.create({ to, code });
}
