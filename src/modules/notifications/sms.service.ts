import { getTwilioClient } from "../../services/twilio";

export async function sendSms({ to, message }: { to: string; message: string }) {
  const client = getTwilioClient();
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_FROM || process.env.TWILIO_NUMBER || process.env.TWILIO_PHONE,
    to,
  });
}
