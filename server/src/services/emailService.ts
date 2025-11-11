import { logInfo } from "../utils/logger.js";

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
};

class EmailService {
  sendEmail(payload: EmailPayload): { id: string } {
    logInfo("Email stub invoked", payload);
    return { id: `email-${Date.now()}` };
  }
}

export const emailService = new EmailService();
