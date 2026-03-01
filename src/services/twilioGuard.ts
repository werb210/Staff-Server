export function ensureTwilioConfigured() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("twilio_not_configured");
  }
}
