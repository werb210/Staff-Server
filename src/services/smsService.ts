import { getTwilioClient } from "./twilio";

export async function sendSMS(to: string, body: string): Promise<void> {
  if (process.env.TEST_MODE === "true") {
    console.log("TEST_MODE — SMS skipped");
    return;
  }

  const from = process.env.TWILIO_NUMBER || process.env.TWILIO_PHONE;
  if (!from || !to) {
    return;
  }

  const client = getTwilioClient();
  await client.messages.create({ to, from, body });
}
