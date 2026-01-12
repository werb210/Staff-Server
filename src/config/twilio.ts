import Twilio from "twilio";

export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    return { available: false as const, client: null };
  }

  return {
    available: true as const,
    client: Twilio(sid, token),
  };
}
