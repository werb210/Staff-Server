import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const twilioAvailable = Boolean(accountSid && authToken);

export const twilioClient = twilioAvailable
  ? twilio(accountSid!, authToken!)
  : null;

if (!twilioAvailable) {
  console.error("Twilio disabled: missing env vars", {
    hasSid: !!accountSid,
    hasToken: !!authToken,
  });
}
