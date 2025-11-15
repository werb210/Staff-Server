import sgMail from "@sendgrid/mail";

import type { JwtUserPayload } from "../types/index.js";
import {
  CommunicationDirection,
  CommunicationType,
} from "./communicationTypes.js";
import { requirePrismaClient } from "./prismaClient.js";

let sendGridConfigured = false;

function ensureSendGridConfigured() {
  if (!sendGridConfigured) {
    const apiKey = process.env.SENDGRID_KEY || process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("SendGrid API key is not configured");
    }

    sgMail.setApiKey(apiKey);
    sendGridConfigured = true;
  }
}

function resolveFromAddress() {
  return process.env.SENDGRID_FROM || "info@boreal.financial";
}

export async function sendEmail(
  contactId: string,
  user: JwtUserPayload,
  subject: string,
  body: string,
) {
  const prisma = await requirePrismaClient();
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  if (!contact.email) {
    throw new Error("Contact does not have an email address");
  }

  const silo = contact.silo;
  if (!user.silos.includes(silo)) {
    throw new Error("Unauthorized silo access");
  }

  ensureSendGridConfigured();

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();

  await sgMail.send({
    to: contact.email,
    from: resolveFromAddress(),
    subject: trimmedSubject,
    text: trimmedBody,
  });

  return prisma.communicationLog.create({
    data: {
      type: CommunicationType.EMAIL,
      direction: CommunicationDirection.OUTBOUND,
      contactId,
      silo,
      messageBody: trimmedBody,
      subject: trimmedSubject,
      sentBy: user.id,
    },
    include: { contact: true },
  });
}

export async function listEmails(user: JwtUserPayload) {
  const prisma = await requirePrismaClient();
  return prisma.communicationLog.findMany({
    where: {
      type: CommunicationType.EMAIL,
      silo: { in: user.silos },
    },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });
}
