import { logInfo } from "../utils/logger.js";

export type SmsPayload = {
  to: string;
  message: string;
};

class TwilioService {
  sendSms(payload: SmsPayload): { sid: string } {
    logInfo("Twilio SMS stub invoked", payload);
    return { sid: `SM-${Date.now()}` };
  }
}

export const twilioService = new TwilioService();
