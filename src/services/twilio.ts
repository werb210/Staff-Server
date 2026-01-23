import Twilio from "twilio";

type TwilioClient = ReturnType<typeof Twilio>;

let client: TwilioClient | null = null;

export function isTwilioEnabled(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

export function getTwilioClient(): TwilioClient | null {
  if (client) return client;
  if (!isTwilioEnabled()) return null;

  client = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
  return client;
}

export function getTwilioVerifyServiceSid(): string {
  if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("Twilio Verify Service SID missing");
  }
  return process.env.TWILIO_VERIFY_SERVICE_SID;
}

export async function sendOtp(
  client: TwilioClient,
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
  client: TwilioClient,
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
