import Twilio from "twilio";

export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();

  if (!sid || !token) {
    return { available: false as const, client: null };
  }

  const hasValidServiceSid = serviceSid.startsWith("VA");

  return {
    available: hasValidServiceSid as boolean,
    client: Twilio(sid, token),
  };
}
