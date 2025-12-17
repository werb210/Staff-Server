import { config } from "../config/config";

export const OTP_ENABLED =
  process.env.OTP_ENABLED === "true" &&
  Boolean(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN);
