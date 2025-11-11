import { randomUUID } from "crypto";

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "queued" | "sent";
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

/**
 * EmailService captures outbound email messages in memory.
 */
class EmailService {
  private readonly emails: EmailMessage[] = [];

  /**
   * Sends (stores) an email and returns the stored message.
   */
  public sendEmail(payload: EmailPayload): EmailMessage {
    const message: EmailMessage = {
      id: randomUUID(),
      to: payload.to,
      from: payload.from ?? "ops@boreal.example",
      subject: payload.subject,
      body: payload.body,
      sentAt: new Date().toISOString(),
      status: "sent",
    };
    this.emails.unshift(message);
    return message;
  }

  /**
   * Returns the email log.
   */
  public listEmails(): EmailMessage[] {
    return [...this.emails];
  }
}

export const emailService = new EmailService();

export type EmailServiceType = EmailService;
