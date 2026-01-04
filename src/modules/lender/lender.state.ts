import { AppError } from "../../middleware/errors";
import { findApplicationById } from "../applications/applications.repo";
import { isPipelineState } from "../applications/pipelineState";
import { transitionPipelineState } from "../applications/applications.service";
import { type PoolClient } from "pg";

export async function ensureApplicationSubmissionState(params: {
  applicationId: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
  client: Pick<PoolClient, "query">;
}): Promise<void> {
  const application = await findApplicationById(params.applicationId, params.client);
  if (!application) {
    throw new AppError("not_found", "Application not found.", 404);
  }
  if (!isPipelineState(application.pipeline_state)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  if (application.pipeline_state !== "UNDER_REVIEW") {
    throw new AppError(
      "invalid_state",
      "Application must be in UNDER_REVIEW to submit to lenders.",
      400
    );
  }

  await transitionPipelineState({
    applicationId: params.applicationId,
    nextState: "LENDER_SUBMITTED",
    actorUserId: params.actorUserId,
    actorRole: null,
    allowOverride: false,
    ip: params.ip,
    userAgent: params.userAgent,
    client: params.client,
  });
}
