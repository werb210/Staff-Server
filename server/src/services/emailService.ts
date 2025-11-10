// Auto-generated stub by Codex
// Stub email service returning a static list of messages

export type EmailRecord = {
  id: string;
  subject: string;
};

class EmailService {
  listEmails(): EmailRecord[] {
    return [{ id: "email-1", subject: "Welcome" }];
  }

  sendEmail(): { message: string } {
    return { message: "sent" };
  }
}

export const emailService = new EmailService();
