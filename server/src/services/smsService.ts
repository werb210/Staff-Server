// server/src/services/smsService.ts
// Core SMS sending layer (Twilio)

import twilio from "twilio";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

type TwilioClient = ReturnType<typeof twilio>;

let client: TwilioClient | null = null;

const getClient = () => {
  if (client) return client;

  if (!env.twilioAccountSid || !env.twilioAuthToken) {
    throw new Error("Twilio credentials missing");
  }

  client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  return client;
};

export const smsService = {
  /**
   * Send an SMS through Twilio
   */
  async send(to: string, body: string) {
    if (!env.twilioPhoneNumber) {
      throw new Error("TWILIO_PHONE_NUMBER missing");
    }

    try {
      const twilioClient = getClient();
      const message = await twilioClient.messages.create({
        from: env.twilioPhoneNumber,
        to,
        body,
      });

      logger.info(`SMS sent → ${to} (sid: ${message.sid})`);
      return message;
    } catch (err: any) {
      logger.error("SMS send failed:", err?.message || err);
      throw new Error(err?.message || "Unknown SMS sending error");
    }
  },

  /**
   * Validate phone numbers before queueing
   */
  validatePhone(phone: string) {
    if (!phone) return false;
    const cleaned = phone.replace(/[^0-9+]/g, "");
    return cleaned.length >= 10;
  },
};

export default smsService;
