import { emailLogsRepo } from "../db/repositories/emailLogs.repo";

export const emailService = {
  async send(to: string, subject: string, body: string) {
    // The actual email sending happens in the controller or Twilio SendGrid client.
    // This logs it.
    return emailLogsRepo.insert({
      to,
      subject,
      body,
      createdAt: new Date()
    });
  }
};
