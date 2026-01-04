import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { findApplicationById } from "../applications/applications.repo";
import {
  createSubmission,
  findSubmissionById,
  findSubmissionByIdempotencyKey,
} from "./lender.repo";

export async function submitApplication(params: {
  applicationId: string;
  idempotencyKey: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ id: string; status: string }> {
  const application = await findApplicationById(params.applicationId);
  if (!application) {
    await recordAuditEvent({
      action: "lender_submission_created",
      actorUserId: params.actorUserId,
      targetUserId: null,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("not_found", "Application not found.", 404);
  }

  const existing = await findSubmissionByIdempotencyKey(params.idempotencyKey);
  if (existing) {
    await recordAuditEvent({
      action: "lender_submission_retried",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
    });
    return { id: existing.id, status: existing.status };
  }

  const submission = await createSubmission({
    applicationId: params.applicationId,
    idempotencyKey: params.idempotencyKey,
    status: "submitted",
  });
  await recordAuditEvent({
    action: "lender_submission_created",
    actorUserId: params.actorUserId,
    targetUserId: application.owner_user_id,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
  });

  return { id: submission.id, status: submission.status };
}

export async function getSubmissionStatus(id: string): Promise<{
  id: string;
  status: string;
  applicationId: string;
}> {
  const submission = await findSubmissionById(id);
  if (!submission) {
    throw new AppError("not_found", "Submission not found.", 404);
  }
  return {
    id: submission.id,
    status: submission.status,
    applicationId: submission.application_id,
  };
}
