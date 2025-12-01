import { communicationsRepo } from "../db/repositories/messages.repo"; // same table
import { emailService } from "./emailService";
import { smsService } from "./smsService";

export const communicationService = {
  async sendEmail(to: string, subject: string, body: string) {
    return emailService.send(to, subject, body);
  },

  async sendSMS(to: string, text: string) {
    return smsService.send(to, text);
  }
};
