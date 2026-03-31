import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  TWILIO_FROM_NUMBER,
  TWILIO_CALLER_ID,
} = process.env;

if (!TWILIO_ACCOUNT_SID) throw new Error("Missing TWILIO_ACCOUNT_SID");
if (!TWILIO_AUTH_TOKEN) throw new Error("Missing TWILIO_AUTH_TOKEN");
if (!TWILIO_VERIFY_SERVICE_SID) throw new Error("Missing TWILIO_VERIFY_SERVICE_SID");
if (!TWILIO_FROM_NUMBER) throw new Error("Missing TWILIO_FROM_NUMBER");

export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
export const verifyServiceSid = TWILIO_VERIFY_SERVICE_SID;
export const fromNumber = TWILIO_FROM_NUMBER;
export const callerId = TWILIO_CALLER_ID || TWILIO_FROM_NUMBER;
