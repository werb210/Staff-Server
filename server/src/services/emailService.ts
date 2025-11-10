export interface EmailRecord {
  id: string;
  subject: string;
  to: string;
  sentAt: string;
}

export interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  body: string;
}

class EmailService {
  private readonly emails: EmailRecord[] = [];

  listEmails(): EmailRecord[] {
    return [...this.emails];
  }

  sendEmail(payload: EmailPayload): EmailRecord {
    const record: EmailRecord = {
      id: `EM${Date.now()}`,
      subject: payload.subject,
      to: payload.to,
      sentAt: new Date().toISOString()
    };
    this.emails.push(record);
    return record;
  }
}

export const emailService = new EmailService();
