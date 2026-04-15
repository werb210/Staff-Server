import { dbQuery } from "../../db.js";
import { randomUUID } from "node:crypto";

export type CrmEventType =
  | "message_sent"
  | "message_received"
  | "sms_sent"
  | "sms_received"
  | "email_sent"
  | "email_received"
  | "call_made"
  | "call_received"
  | "document_uploaded"
  | "document_accepted"
  | "document_rejected"
  | "stage_changed"
  | "note_added"
  | "offer_viewed"
  | "offer_changes_requested"
  | "signnow_sent"
  | "signnow_signed"
  | "referral_submitted"
  | "recording_consent_given"
  | "readiness_submission"
  | "application_submitted";

export async function logCrmEvent(params: {
  contactId: string;
  applicationId?: string | null;
  eventType: CrmEventType;
  payload?: Record<string, unknown>;
  actorUserId?: string | null;
}): Promise<void> {
  await dbQuery(
    `insert into crm_timeline_events (id, contact_id, application_id, event_type, payload, actor_user_id, created_at)
     values ($1, $2, $3, $4, $5::jsonb, $6, now())`,
    [
      randomUUID(),
      params.contactId,
      params.applicationId ?? null,
      params.eventType,
      JSON.stringify(params.payload ?? {}),
      params.actorUserId ?? null,
    ]
  );
}
