import twilio from "twilio";

const required = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
  "TWILIO_FROM_NUMBER",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
export const fromNumber = process.env.TWILIO_FROM_NUMBER!;
export const callerId = process.env.TWILIO_CALLER_ID || fromNumber;
