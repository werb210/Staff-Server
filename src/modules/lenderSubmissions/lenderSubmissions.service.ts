import { AppError } from "../../middleware/errors";
import { findApplicationById } from "../applications/applications.repo";
import { submitApplication } from "../lender/lender.service";

export async function submitLenderSubmission(params: {
  applicationId: string;
  idempotencyKey: string | null;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ statusCode: number; value: { id: string; status: string; failureReason?: string | null } }> {
  const application = await findApplicationById(params.applicationId);
  if (!application) {
    throw new AppError("not_found", "Application not found.", 404);
  }
  if (!application.lender_id) {
    throw new AppError("missing_lender", "Application lender is not set.", 400);
  }
  if (!application.lender_product_id) {
    throw new AppError("missing_product", "Application lender product is not set.", 400);
  }

  const result = await submitApplication({
    applicationId: params.applicationId,
    idempotencyKey: params.idempotencyKey,
    lenderId: application.lender_id,
    lenderProductId: application.lender_product_id,
    actorUserId: params.actorUserId,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { statusCode: result.statusCode, value: result.value };
}
