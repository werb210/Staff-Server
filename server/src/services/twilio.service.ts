import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
const authToken = process.env.TWILIO_AUTH_TOKEN as string;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID as string;

const client = Twilio(accountSid, authToken);

export async function sendVerificationCode(phone: string): Promise<void> {
  await client.verify.v2
    .services(verifySid)
    .verifications.create({ to: phone, channel: "sms" });
}

export async function checkVerificationCode(
  phone: string,
  code: string
): Promise<boolean> {
  const result = await client.verify.v2
    .services(verifySid)
    .verificationChecks.create({ to: phone, code });

  return result.status === "approved";
}
