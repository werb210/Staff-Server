export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

/**
 * Stub email service used by the communication routes.
 */
class EmailService {
  private readonly emails: EmailPayload[] = [
    {
      to: "applicant@example.com",
      subject: "Welcome to the lender portal",
      body: "Thanks for signing up."
    }
  ];

  listEmails(): EmailPayload[] {
    return [...this.emails];
  }
}

export const emailService = new EmailService();
