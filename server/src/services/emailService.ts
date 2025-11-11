import { randomUUID } from "crypto";

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "queued" | "sent";
  direction: "inbound" | "outbound";
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
export class EmailService {
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
      direction: "outbound",
    };
    this.emails.unshift(message);
    return message;
  }

  /**
   * Records an inbound email from Office 365 webhook simulations.
   */
  public receiveEmail(payload: { from: string; to: string; subject: string; body: string }): EmailMessage {
    const message: EmailMessage = {
      id: randomUUID(),
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
      sentAt: new Date().toISOString(),
      status: "sent",
      direction: "inbound",
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

  /**
   * Groups messages by counterparty to form conversation threads.
   */
  public listThreads(): Array<{ contact: string; messages: EmailMessage[] }> {
    const grouped = new Map<string, EmailMessage[]>();
    for (const email of this.emails) {
      const contact = email.direction === "outbound" ? email.to : email.from;
      const thread = grouped.get(contact) ?? [];
      thread.push(email);
      grouped.set(contact, thread);
    }
    return Array.from(grouped.entries()).map(([contact, messages]) => ({
      contact,
      messages: messages.sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    }));
  }
}

export const emailService = new EmailService();

export type EmailServiceType = EmailService;

export const createEmailService = (): EmailService => new EmailService();
