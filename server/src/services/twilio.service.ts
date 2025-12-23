import Twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  throw new Error("Twilio environment variables are not fully defined");
}

const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export async function sendVerificationCode(phone: string): Promise<void> {
  await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to: phone, channel: "sms" });
}

export async function checkVerificationCode(
  phone: string,
  code: string
): Promise<boolean> {
  const result = await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phone, code });

  return result.status === "approved";
}
