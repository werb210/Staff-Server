// server/src/services/smsService.ts
// Core SMS sending layer (Twilio)

import twilio from "twilio";
import { ENV } from "../utils/env.js";
import { logger } from "../utils/logger.js";

type TwilioClient = ReturnType<typeof twilio>;

let client: TwilioClient | null = null;

const getClient = () => {
  if (client) return client;

  if (!ENV.TWILIO_ACCOUNT_SID || !ENV.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials missing");
  }

  client = twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);
  return client;
};

export const smsService = {
  /**
   * Send an SMS through Twilio
   */
  async send(to: string, body: string) {
    if (!ENV.TWILIO_PHONE_NUMBER) {
      throw new Error("TWILIO_PHONE_NUMBER missing");
    }

    try {
      const twilioClient = getClient();
      const message = await twilioClient.messages.create({
        from: ENV.TWILIO_PHONE_NUMBER,
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
