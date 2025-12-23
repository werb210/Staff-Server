import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM,
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
  throw new Error("Twilio env vars missing");
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export async function sendSmsCode(to: string, code: string) {
  await client.messages.create({
    from: TWILIO_FROM,
    to,
    body: `Your Boreal verification code is: ${code}`,
  });
}
