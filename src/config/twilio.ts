import twilio from "twilio";
import type Twilio from "twilio/lib/rest/Twilio";

type TwilioEnv = {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function readTwilioEnv(): TwilioEnv {
  return {
    accountSid: (process.env.TWILIO_ACCOUNT_SID ?? "").trim(),
    authToken: (process.env.TWILIO_AUTH_TOKEN ?? "").trim(),
    verifyServiceSid: (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim(),
  };
}

const env = readTwilioEnv();
export const twilioEnabled = parseBoolean(process.env.TWILIO_ENABLED, true);

if (twilioEnabled) {
  const missing = [
    ["TWILIO_ACCOUNT_SID", env.accountSid],
    ["TWILIO_AUTH_TOKEN", env.authToken],
    ["TWILIO_VERIFY_SERVICE_SID", env.verifyServiceSid],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Twilio env vars: ${missing.join(", ")}`);
  }
}

export const twilioVerifyServiceSid = env.verifyServiceSid;
export const twilioClient: Twilio = twilio(
  env.accountSid || "disabled",
  env.authToken || "disabled"
);
