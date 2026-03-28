import { config } from "../config";

export function sendSMS(to: string, body: string) {
  if (process.env.NODE_ENV === "test") {
    return Promise.resolve({ sid: "test" });
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require("twilio");
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  return client.messages.create({
    to,
    body,
    from: process.env.TWILIO_PHONE ?? config.twilio.phone,
  });
}
