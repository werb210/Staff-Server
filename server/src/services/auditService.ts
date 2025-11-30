import { db } from '../db/db.js';
import { auditLogs } from '../db/schema/audit.js';

type AuditPayload = {
  eventType: string;
  userId?: string | null;
  applicationId?: string | null;
  details?: any;
};

//
// ======================================================
//  Generic Audit Logger
// ======================================================
export async function logEvent(payload: AuditPayload) {
  const { eventType, userId = null, applicationId = null, details = {} } = payload;

  const [saved] = await db.insert(auditLogs).values({
    eventType,
    userId,
    applicationId,
    details,
    createdAt: new Date(),
  }).returning();

  // Broadcast critical events only
  if (["error", "document", "pipeline", "security"].includes(eventType)) {
    broadcast({
      type: `audit-${eventType}`,
      data: saved,
    });
  }

  return saved;
}

//
// ======================================================
//  Specialized Audit Helpers
// ======================================================
export async function logDocumentEvent(applicationId: string, userId: string | null, details: any) {
  return logEvent({
    eventType: "document",
    userId,
    applicationId,
    details,
  });
}

export async function logPipelineEvent(applicationId: string, userId: string | null, details: any) {
  return logEvent({
    eventType: "pipeline",
    userId,
    applicationId,
    details,
  });
}

export async function logChatEvent(applicationId: string, sender: string, body: string) {
  return logEvent({
    eventType: "chat",
    userId: sender === "staff" ? sender : null,
    applicationId,
    details: { body },
  });
}

export async function logError(error: any, userId: string | null = null) {
  return logEvent({
    eventType: "error",
    userId,
    details: {
      message: error?.message,
      stack: error?.stack,
    },
  });
}
