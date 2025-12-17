import twilio from "twilio";
import { config } from "../config/config";

const hasTwilioCredentials = Boolean(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN);

export const twilioClient = hasTwilioCredentials
  ? twilio(config.TWILIO_ACCOUNT_SID as string, config.TWILIO_AUTH_TOKEN as string)
  : null;

export const isTwilioVerifyConfigured =
  hasTwilioCredentials && Boolean(config.TWILIO_VERIFY_SERVICE_SID);

export const hasTwilioMessaging = hasTwilioCredentials;
