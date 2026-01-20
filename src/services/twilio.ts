import Twilio from "twilio";

export type TwilioClient = ReturnType<typeof Twilio>;

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
};

function readTwilioConfig(): TwilioConfig | null {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } =
    process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return null;
  }
  return {
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    verifyServiceSid: TWILIO_VERIFY_SERVICE_SID,
  };
}

export const isTwilioEnabled = (): boolean => Boolean(readTwilioConfig());

export let twilioClient: TwilioClient | null = null;

export function getTwilioClient(): TwilioClient | null {
  const config = readTwilioConfig();
  if (!config) {
    return null;
  }
  if (!twilioClient) {
    twilioClient = Twilio(config.accountSid, config.authToken);
  }
  return twilioClient;
}

export function getTwilioVerifyServiceSid(): string | null {
  return readTwilioConfig()?.verifyServiceSid ?? null;
}

export async function sendOtp(
  client: NonNullable<ReturnType<typeof getTwilioClient>>,
  verifyServiceSid: string,
  phoneE164: string
): Promise<{ sid?: string; status?: string }> {
  return client.verify.v2
    .services(verifyServiceSid)
    .verifications.create({ to: phoneE164, channel: "sms" });
}
