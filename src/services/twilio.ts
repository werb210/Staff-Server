import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;
let warnedMissingCredentials = false;
let warnedMissingVerifySid = false;

export function getTwilioClient(): ReturnType<typeof twilio> {
  if (client) return client;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    if (!warnedMissingCredentials) {
      console.warn("Twilio credentials are missing; SMS/voice features are effectively disabled.");
      warnedMissingCredentials = true;
    }
    client = twilio(sid ?? "", token ?? "");
    return client;
  }

  client = twilio(sid, token);
  return client;
}

export function getVerifyServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!sid) {
    if (!warnedMissingVerifySid) {
      console.warn("Twilio Verify service SID is missing; verification flows are effectively disabled.");
      warnedMissingVerifySid = true;
    }
    return "";
  }

  return sid;
}
