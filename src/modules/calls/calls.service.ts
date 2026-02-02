import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import {
  type CallLogRecord,
  type CallStatus,
  createCallLog,
  findCallLogById,
  listCallLogs,
  updateCallLogStatus,
} from "./calls.repo";

export async function startCall(params: {
  phoneNumber: string;
  fromNumber?: string | null;
  toNumber?: string | null;
  direction: "outbound" | "inbound";
  status?: CallStatus;
  staffUserId: string | null;
  twilioCallSid?: string | null;
  crmContactId?: string | null;
  applicationId?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<CallLogRecord> {
  const status = params.status ?? "initiated";
  const record = await createCallLog({
    phoneNumber: params.phoneNumber,
    fromNumber: params.fromNumber ?? null,
    toNumber: params.toNumber ?? null,
    direction: params.direction,
    status,
    staffUserId: params.staffUserId,
    twilioCallSid: params.twilioCallSid ?? null,
    crmContactId: params.crmContactId ?? null,
    applicationId: params.applicationId ?? null,
  });

  await recordAuditEvent({
    action: "call_started",
    actorUserId: params.staffUserId,
    targetUserId: null,
    targetType: "call_log",
    targetId: record.id,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
    metadata: {
      phone_number: record.phone_number,
      from_number: record.from_number,
      to_number: record.to_number,
      twilio_call_sid: record.twilio_call_sid,
      direction: record.direction,
      status: record.status,
      crm_contact_id: record.crm_contact_id,
      application_id: record.application_id,
    },
  });

  return record;
}

export async function updateCallStatus(params: {
  id: string;
  status: CallStatus;
  durationSeconds?: number | null;
  fromNumber?: string | null;
  toNumber?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  actorUserId?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<CallLogRecord> {
  const existing = await findCallLogById(params.id);
  if (!existing) {
    throw new AppError("not_found", "Call not found.", 404);
  }

  const shouldUpdateStatus = existing.status !== params.status;
  const shouldUpdateDuration =
    params.durationSeconds !== undefined &&
    params.durationSeconds !== existing.duration_seconds;
  const shouldUpdateFrom =
    params.fromNumber !== undefined && params.fromNumber !== existing.from_number;
  const shouldUpdateTo =
    params.toNumber !== undefined && params.toNumber !== existing.to_number;
  const shouldUpdateErrorCode =
    params.errorCode !== undefined && params.errorCode !== existing.error_code;
  const shouldUpdateErrorMessage =
    params.errorMessage !== undefined && params.errorMessage !== existing.error_message;
  const shouldEnd =
    (params.status === "ended" ||
      params.status === "failed" ||
      params.status === "completed" ||
      params.status === "cancelled" ||
      params.status === "canceled") &&
    existing.ended_at === null;

  if (
    !shouldUpdateStatus &&
    !shouldUpdateDuration &&
    !shouldUpdateFrom &&
    !shouldUpdateTo &&
    !shouldUpdateErrorCode &&
    !shouldUpdateErrorMessage &&
    !shouldEnd
  ) {
    return existing;
  }

  const updated = await updateCallLogStatus({
    id: params.id,
    status: params.status,
    durationSeconds:
      params.durationSeconds !== undefined
        ? params.durationSeconds
        : existing.duration_seconds,
    endedAt: shouldEnd ? new Date() : existing.ended_at,
    fromNumber:
      params.fromNumber !== undefined ? params.fromNumber : existing.from_number,
    toNumber: params.toNumber !== undefined ? params.toNumber : existing.to_number,
    errorCode:
      params.errorCode !== undefined ? params.errorCode : existing.error_code,
    errorMessage:
      params.errorMessage !== undefined ? params.errorMessage : existing.error_message,
  });

  if (!updated) {
    throw new AppError("not_found", "Call not found.", 404);
  }

  if (
    shouldUpdateStatus ||
    shouldUpdateDuration ||
    shouldUpdateFrom ||
    shouldUpdateTo ||
    shouldUpdateErrorCode ||
    shouldUpdateErrorMessage
  ) {
    await recordAuditEvent({
      action: "call_status_updated",
      actorUserId: params.actorUserId ?? null,
      targetUserId: null,
      targetType: "call_log",
      targetId: updated.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      metadata: {
        phone_number: updated.phone_number,
        from_number: updated.from_number,
        to_number: updated.to_number,
        twilio_call_sid: updated.twilio_call_sid,
        direction: updated.direction,
        status: updated.status,
        duration_seconds: updated.duration_seconds,
        crm_contact_id: updated.crm_contact_id,
        application_id: updated.application_id,
        error_code: updated.error_code,
        error_message: updated.error_message,
      },
    });
  }

  return updated;
}

export async function endCall(params: {
  id: string;
  durationSeconds?: number | null;
  staffUserId: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<CallLogRecord> {
  const existing = await findCallLogById(params.id);
  if (!existing) {
    throw new AppError("not_found", "Call not found.", 404);
  }

  const shouldEnd = existing.status !== "ended";
  const updated = await updateCallStatus({
    id: params.id,
    status: "ended",
    durationSeconds: params.durationSeconds ?? existing.duration_seconds,
    actorUserId: params.staffUserId,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  if (shouldEnd) {
    await recordAuditEvent({
      action: "call_ended",
      actorUserId: params.staffUserId,
      targetUserId: null,
      targetType: "call_log",
      targetId: updated.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      metadata: {
        phone_number: updated.phone_number,
        from_number: updated.from_number,
        to_number: updated.to_number,
        direction: updated.direction,
        status: updated.status,
        duration_seconds: updated.duration_seconds,
        crm_contact_id: updated.crm_contact_id,
        application_id: updated.application_id,
      },
    });
  }

  return updated;
}

export async function listCalls(params: {
  contactId?: string | null;
  applicationId?: string | null;
}): Promise<CallLogRecord[]> {
  return listCallLogs({
    contactId: params.contactId ?? null,
    applicationId: params.applicationId ?? null,
  });
}
