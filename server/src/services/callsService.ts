import type { JwtUserPayload } from "../types/index.js";
import {
  getTwilioClient,
  resolveNumberForSilo,
} from "./communicationProviders.js";
import {
  CommunicationDirection,
  CommunicationType,
} from "./communicationTypes.js";
import { requirePrismaClient } from "./prismaClient.js";

export async function startCall(contactId: string, user: JwtUserPayload) {
  const prisma = await requirePrismaClient();
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  if (!contact.phone) {
    throw new Error("Contact does not have a phone number");
  }

  const silo = contact.silo;
  if (!user.silos.includes(silo)) {
    throw new Error("Unauthorized silo access");
  }

  const webhookUrl = process.env.TWILIO_VOICE_WEBHOOK;
  if (!webhookUrl) {
    throw new Error("Twilio voice webhook is not configured");
  }

  const fromNumber = resolveNumberForSilo(silo);
  const client = getTwilioClient();

  const call = await client.calls.create({
    to: contact.phone,
    from: fromNumber,
    url: webhookUrl,
  });

  return prisma.communicationLog.create({
    data: {
      type: CommunicationType.CALL,
      direction: CommunicationDirection.OUTBOUND,
      contactId,
      silo,
      providerMessageId: call.sid,
      sentBy: user.id,
    },
    include: { contact: true },
  });
}

export async function listCalls(user: JwtUserPayload) {
  const prisma = await requirePrismaClient();
  return prisma.communicationLog.findMany({
    where: {
      type: CommunicationType.CALL,
      silo: { in: user.silos },
    },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });
}
