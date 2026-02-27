import Twilio from "twilio";
import { logInfo } from "../observability/logger";

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

  cachedClient = Twilio(accountSid, authToken);
  return cachedClient;
}

export function getVerifyServiceSid(): string {
  return requireEnv("TWILIO_VERIFY_SERVICE_SID");
}

export function dial(number: string): Promise<{ sid: string }> {
  const isMock = process.env.TWILIO_MODE === "mock";
  if (isMock) {
    logInfo("twilio_mock_call_placed", { msg: "Mock call placed", to: number });
    return Promise.resolve({ sid: "mock-call" });
  }

  const realTwilioClient = getTwilioClient();
  return realTwilioClient.calls.create({
    to: number,
    from: requireEnv("TWILIO_FROM"),
    url: requireEnv("TWILIO_WEBHOOK"),
  });
}
