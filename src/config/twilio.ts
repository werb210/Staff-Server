export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    return { available: false as const };
  }

  if (!sid.startsWith("AC")) {
    throw new Error("TWILIO_ACCOUNT_SID must be an Account SID (AC...)");
  }

  return {
    available: true as const,
    client: require("twilio")(sid, token),
  };
}
