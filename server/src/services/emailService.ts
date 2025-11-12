import { randomUUID } from "crypto";
import axios from "axios";
import sendGridMail from "@sendgrid/mail";

// If logger doesn't exist or fails, fallback to console.
let safeLogInfo: (msg: string, meta?: any) => void = console.log;
let safeLogError: (msg: string, meta?: any) => void = console.error;

try {
  const { logInfo, logError } = await import("../utils/logger.js");
  safeLogInfo = logInfo ?? console.log;
  safeLogError = logError ?? console.error;
} catch {
  // No logger found — safe fallback already set
}

export type EmailDirection = "incoming" | "outgoing";
export type EmailStatus = "queued" | "sent" | "failed";
export type EmailProvider = "sendgrid" | "graph" | "manual";

export interface EmailMessageRecord {
  id: string;
  contactId: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  direction: EmailDirection;
  status: EmailStatus;
  provider: EmailProvider;
  createdAt: string;
  sentBy?: string;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
}

// The in-memory array is fine TEMPORARILY while DB integration work is done.
const emailMessages: EmailMessageRecord[] = [];
const contactDirectory = new Map<string, string>();

/* -----------------------------------------------------
   SendGrid Setup
----------------------------------------------------- */

let sendGridReady = false;

const configureSendGrid = (): void => {
  if (sendGridReady) return;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return; // fail silently, but email will not send

  sendGridMail.setApiKey(apiKey);
  sendGridReady = true;
};

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */

const registerContactEmail = (contactId: string, email: string): void => {
  if (email.trim().length > 0) {
    contactDirectory.set(contactId, email.trim().toLowerCase());
  }
};

const resolveContactEmail = (contactId: string, fallback?: string): string => {
  if (fallback && fallback.trim().length > 0) {
    registerContactEmail(contactId, fallback);
    return fallback;
  }
  const found = contactDirectory.get(contactId);
  if (!found) {
    throw new Error(`Contact ${contactId} email is unknown`);
  }
  return found;
};

/* -----------------------------------------------------
   Send Email via SendGrid
----------------------------------------------------- */

const sendEmailViaSendGrid = async (record: EmailMessageRecord): Promise<void> => {
  configureSendGrid();

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? record.from;

  if (!apiKey || !fromEmail) {
    record.status = "failed";
    safeLogError("SendGrid not configured", { recordId: record.id });
    return;
  }

  try {
    const [response] = await sendGridMail.send({
      to: record.to,
      from: fromEmail,
      subject: record.subject,
      html: record.body,
      text: record.body,
    });

    record.status = "sent";
    record.providerMessageId = response.headers["x-message-id"] as string | undefined;
    safeLogInfo("Email sent via SendGrid", { id: record.id });
  } catch (err) {
    record.status = "failed";
    safeLogError("Failed to send via SendGrid", err);
  }
};

/* -----------------------------------------------------
   Send Email via Microsoft Graph (App-Only Flow)
----------------------------------------------------- */

const sendEmailViaGraph = async (
  record: EmailMessageRecord,
  senderEmail: string,
): Promise<void> => {
  const tenantId = process.env.O365_TENANT_ID;
  const clientId = process.env.O365_CLIENT_ID;
  const clientSecret = process.env.O365_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    record.status = "failed";
    safeLogError("Graph not configured", { id: record.id });
    return;
  }

  try {
    // 1) Acquire token
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data?.access_token;
    if (!accessToken) throw new Error("Missing Graph access token");

    // 2) Send email
    await axios.post(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
      {
        message: {
          subject: record.subject,
          body: { contentType: "HTML", content: record.body },
          toRecipients: [{ emailAddress: { address: record.to } }],
        },
        saveToSentItems: true,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    record.status = "sent";
    safeLogInfo("Email sent via MS Graph", { id: record.id });
  } catch (err) {
    record.status = "failed";
    safeLogError("Failed to send via Microsoft Graph", err);
  }
};

/* -----------------------------------------------------
   Public API
----------------------------------------------------- */

export const sendEmail = async (
  contactId: string,
  subject: string,
  body: string,
  opts: {
    to?: string;
    userEmail?: string;
    sendAsSystem?: boolean;
    sentBy?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<EmailMessageRecord> => {
  const createdAt = new Date().toISOString();
  const recipient = resolveContactEmail(contactId, opts.to);
  registerContactEmail(contactId, recipient);

  const sendAsSystem = opts.sendAsSystem ?? false;

  const senderEmail =
    sendAsSystem
      ? process.env.SENDGRID_FROM_EMAIL ??
        process.env.O365_SENDER_EMAIL ??
        "noreply@staff.local"
      : opts.userEmail ??
        process.env.O365_SENDER_EMAIL ??
        "noreply@staff.local";

  const record: EmailMessageRecord = {
    id: randomUUID(),
    contactId,
    to: recipient,
    from: senderEmail,
    subject,
    body,
    direction: "outgoing",
    status: "queued",
    provider: sendAsSystem ? "sendgrid" : "graph",
    createdAt,
    sentBy: opts.sentBy,
    metadata: opts.metadata,
  };

  emailMessages.unshift(record);

  // Fire async
  if (sendAsSystem) {
    void sendEmailViaSendGrid(record);
  } else {
    void sendEmailViaGraph(record, senderEmail);
  }

  return record;
};

export const recordInboundEmail = (
  contactId: string,
  payload: {
    from: string;
    to: string;
    subject: string;
    body: string;
    metadata?: Record<string, unknown>;
  }
): EmailMessageRecord => {
  const createdAt = new Date().toISOString();
  registerContactEmail(contactId, payload.from);

  const record: EmailMessageRecord = {
    id: randomUUID(),
    contactId,
    to: payload.to,
    from: payload.from,
    subject: payload.subject,
    body: payload.body,
    direction: "incoming",
    status: "sent",
    provider: "manual",
    createdAt,
    metadata: payload.metadata,
  };

  emailMessages.unshift(record);
  return record;
};

export class EmailService {
  public async sendEmail(payload: {
    to: string;
    from?: string;
    subject: string;
    body: string;
  }) {
    const record = await sendEmail(
      payload.to,
      payload.subject,
      payload.body,
      { to: payload.to, sendAsSystem: true }
    );

    return {
      id: record.id,
      to: record.to,
      from: record.from,
      subject: record.subject,
      body: record.body,
      sentAt: record.createdAt,
      status: record.status,
      direction: record.direction === "outgoing" ? "outbound" : "inbound",
    };
  }

  public receiveEmail(payload: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }) {
    const record = recordInboundEmail(payload.from, payload);

    return {
      id: record.id,
      to: record.to,
      from: record.from,
      subject: record.subject,
      body: record.body,
      sentAt: record.createdAt,
      status: record.status,
      direction: "inbound",
    };
  }

  public listEmails() {
    return emailMessages.map((m) => ({
      id: m.id,
      to: m.to,
      from: m.from,
      subject: m.subject,
      body: m.body,
      sentAt: m.createdAt,
      status: m.status,
      direction: m.direction === "outgoing" ? "outbound" : "inbound",
    }));
  }

  public listThreads() {
    const map = new Map<string, EmailMessageRecord[]>();

    for (const msg of emailMessages) {
      const key = msg.direction === "outgoing" ? msg.to : msg.from;
      const arr = map.get(key) ?? [];
      arr.push(msg);
      map.set(key, arr);
    }

    return Array.from(map.entries()).map(([contact, items]) => ({
      contact,
      messages: items
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((m) => ({
          id: m.id,
          to: m.to,
          from: m.from,
          subject: m.subject,
          body: m.body,
          sentAt: m.createdAt,
          status: m.status,
          direction: m.direction === "outgoing" ? "outbound" : "inbound",
        })),
    }));
  }
}

export const emailService = new EmailService();
