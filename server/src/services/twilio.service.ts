import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

const isConfigured = Boolean(accountSid && authToken && verifySid);

const client = isConfigured && accountSid && authToken ? Twilio(accountSid, authToken) : null;

function requireClient() {
  if (!client || !verifySid) {
    throw new Error("Twilio client is not configured");
  }
}

export async function sendVerificationCode(phone: string): Promise<void> {
  requireClient();
  await client!
    .verify.v2.services(verifySid!)
    .verifications.create({ to: phone, channel: "sms" });
}

export async function checkVerificationCode(
  phone: string,
  code: string
): Promise<boolean> {
  requireClient();
  const result = await client!
    .verify.v2.services(verifySid!)
    .verificationChecks.create({ to: phone, code });

  return result.status === "approved";
}

export const twilioConfigured = isConfigured;
