import { randomUUID } from "crypto";
import { CallLogSchema, EmailPayloadSchema, SmsPayloadSchema } from "../schemas/communicationSchemas.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";
import { emailService } from "./emailService.js";
import { twilioService } from "./twilioService.js";

type SmsRecord = {
  id: string;
  to: string;
  message: string;
  sid: string;
  sentAt: string;
};

type EmailRecord = {
  id: string;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  sentAt: string;
};

type CallRecord = {
  id: string;
  to: string;
  outcome: string;
  notes?: string;
  createdAt: string;
};

class CommunicationService {
  private sms: SmsRecord[] = [];
  private emails: EmailRecord[] = [];
  private calls: CallRecord[] = [];

  constructor() {
    const now = new Date().toISOString();
    this.sms.push({
      id: randomUUID(),
      to: "+1234567890",
      message: "Welcome to Boreal",
      sid: "SM-seed",
      sentAt: now,
    });
    this.emails.push({
      id: randomUUID(),
      to: "client@example.com",
      subject: "Getting Started",
      body: "Thanks for choosing Boreal",
      messageId: "email-seed",
      sentAt: now,
    });
  }

  listCommunications(): { sms: SmsRecord[]; emails: EmailRecord[]; calls: CallRecord[] } {
    logInfo("Listing communications");
    return { sms: this.sms, emails: this.emails, calls: this.calls };
  }

  sendSms(payload: unknown): SmsRecord {
    const data = parseWithSchema(SmsPayloadSchema, payload);
    logInfo("Sending SMS", data);
    const response = twilioService.sendSms(data);
    const record: SmsRecord = {
      id: randomUUID(),
      sentAt: new Date().toISOString(),
      sid: response.sid,
      ...data,
    };
    this.sms.push(record);
    return record;
  }

  sendEmail(payload: unknown): EmailRecord {
    const data = parseWithSchema(EmailPayloadSchema, payload);
    logInfo("Sending email", data);
    const response = emailService.sendEmail(data);
    const record: EmailRecord = {
      id: randomUUID(),
      sentAt: new Date().toISOString(),
      messageId: response.id,
      ...data,
    };
    this.emails.push(record);
    return record;
  }

  logCall(payload: unknown): CallRecord {
    const data = parseWithSchema(CallLogSchema, payload);
    logInfo("Logging call", data);
    const record: CallRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.calls.push(record);
    return record;
  }

  deleteCommunication(id: string): boolean {
    logInfo("Deleting communication", { id });
    const before = this.sms.length + this.emails.length + this.calls.length;
    this.sms = this.sms.filter((item) => item.id !== id);
    this.emails = this.emails.filter((item) => item.id !== id);
    this.calls = this.calls.filter((item) => item.id !== id);
    const after = this.sms.length + this.emails.length + this.calls.length;
    return before !== after;
  }
}

export const communicationService = new CommunicationService();
