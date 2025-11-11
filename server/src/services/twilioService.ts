import { randomUUID } from "crypto";

export interface SmsMessage {
  id: string;
  to: string;
  from: string;
  body: string;
  sentAt: string;
  status: "queued" | "sent";
  direction: "inbound" | "outbound";
}

export interface CallLog {
  id: string;
  to: string;
  from: string;
  durationSeconds: number;
  notes?: string;
  outcome: "completed" | "no-answer" | "busy";
  createdAt: string;
}

/**
 * TwilioService mimics Twilio interactions by storing records in memory.
 */
export class TwilioService {
  private readonly messages: SmsMessage[] = [];
  private readonly calls: CallLog[] = [];

  constructor() {
    const now = new Date();
    this.messages.push({
      id: randomUUID(),
      to: "+15551234567",
      from: "+15557654321",
      body: "Reminder: application review scheduled today",
      sentAt: now.toISOString(),
      status: "sent",
      direction: "outbound",
    });
    this.calls.push({
      id: randomUUID(),
      to: "+15559871234",
      from: "+15557654321",
      durationSeconds: 180,
      notes: "Confirmed required documents",
      outcome: "completed",
      createdAt: now.toISOString(),
    });
  }

  /**
   * Sends an SMS by recording it in memory.
   */
  public sendSms(to: string, body: string, from = "+15557654321"): SmsMessage {
    const message: SmsMessage = {
      id: randomUUID(),
      to,
      from,
      body,
      sentAt: new Date().toISOString(),
      status: "sent",
      direction: "outbound",
    };
    this.messages.unshift(message);
    return message;
  }

  /**
   * Records an inbound SMS from Twilio's webhook simulation.
   */
  public receiveSms(from: string, body: string, to = "+15557654321"): SmsMessage {
    const message: SmsMessage = {
      id: randomUUID(),
      to,
      from,
      body,
      sentAt: new Date().toISOString(),
      status: "sent",
      direction: "inbound",
    };
    this.messages.unshift(message);
    return message;
  }

  /**
   * Returns the SMS log.
   */
  public listMessages(): SmsMessage[] {
    return [...this.messages];
  }

  /**
   * Returns threaded conversations grouped by counterparty.
   */
  public listThreads(): Array<{ contact: string; messages: SmsMessage[] }> {
    const grouped = new Map<string, SmsMessage[]>();
    for (const message of this.messages) {
      const contact = message.direction === "outbound" ? message.to : message.from;
      const thread = grouped.get(contact) ?? [];
      thread.push(message);
      grouped.set(contact, thread);
    }
    return Array.from(grouped.entries()).map(([contact, messages]) => ({
      contact,
      messages: messages.sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    }));
  }

  /**
   * Records a call event.
   */
  public logCall(
    to: string,
    from: string,
    durationSeconds: number,
    outcome: CallLog["outcome"],
    notes?: string,
  ): CallLog {
    const call: CallLog = {
      id: randomUUID(),
      to,
      from,
      durationSeconds,
      notes,
      outcome,
      createdAt: new Date().toISOString(),
    };
    this.calls.unshift(call);
    return call;
  }

  /**
   * Returns the call log.
   */
  public listCalls(): CallLog[] {
    return [...this.calls];
  }
}

export const twilioService = new TwilioService();

export type TwilioServiceType = TwilioService;

export const createTwilioService = (): TwilioService => new TwilioService();
