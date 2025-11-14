import { randomUUID } from "crypto";
import type { Silo } from "./prisma.js";
import { requireUserSiloAccess, type UserContext } from "./prisma.js";

type SMSPayload = {
  to?: string;
  body?: string;
};

type EmailPayload = {
  to?: string;
  subject?: string;
  body?: string;
};

type BaseMessage = {
  id: string;
  silo: Silo;
  userId: string | undefined;
  createdAt: Date;
};

type SMSMessage = BaseMessage & {
  type: "sms";
  to: string;
  body: string;
};

type EmailMessage = BaseMessage & {
  type: "email";
  to: string;
  subject: string;
  body: string;
};

const smsLog: SMSMessage[] = [];
const emailLog: EmailMessage[] = [];

export const communicationService = {
  async sendSMS(user: UserContext, silo: Silo, payload: SMSPayload) {
    requireUserSiloAccess(user.silos, silo);

    if (!payload.to || !payload.body) {
      throw new Error("Missing SMS recipient or body");
    }

    const message: SMSMessage = {
      id: randomUUID(),
      type: "sms",
      silo,
      to: payload.to,
      body: payload.body,
      userId: user.id,
      createdAt: new Date(),
    };

    smsLog.push(message);
    return message;
  },

  async sendEmail(user: UserContext, silo: Silo, payload: EmailPayload) {
    requireUserSiloAccess(user.silos, silo);

    if (!payload.to || !payload.subject || !payload.body) {
      throw new Error("Missing email fields");
    }

    const message: EmailMessage = {
      id: randomUUID(),
      type: "email",
      silo,
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
      userId: user.id,
      createdAt: new Date(),
    };

    emailLog.push(message);
    return message;
  },

  getSMSLog() {
    return [...smsLog];
  },

  getEmailLog() {
    return [...emailLog];
  },
};
