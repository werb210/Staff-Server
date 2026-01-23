import Twilio from "twilio";

type TwilioClient = ReturnType<typeof Twilio>;

let cachedClient: TwilioClient | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export function getTwilioClient(): TwilioClient {
  if (cachedClient) return cachedClient;

  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");

  cachedClient = new Twilio(accountSid, authToken);
  return cachedClient;
}

export function getVerifyServiceSid(): string {
  return requireEnv("TWILIO_VERIFY_SERVICE_SID");
}
