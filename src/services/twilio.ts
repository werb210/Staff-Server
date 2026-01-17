import Twilio from "twilio";

export type TwilioClient = ReturnType<typeof Twilio>;

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
};

function getTwilioConfig(): TwilioConfig | null {
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

export const isTwilioEnabled = (): boolean => Boolean(getTwilioConfig());

export let twilioClient: TwilioClient | null = null;

export function getTwilioClient(): TwilioClient | null {
  const config = getTwilioConfig();
  if (!config) {
    return null;
  }
  if (!twilioClient) {
    twilioClient = Twilio(config.accountSid, config.authToken);
  }
  return twilioClient;
}

export const VERIFY_SERVICE_SID =
  process.env.TWILIO_VERIFY_SERVICE_SID ?? null;
