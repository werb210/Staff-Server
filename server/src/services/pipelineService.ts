// server/src/services/pipelineService.ts
import applicationsRepo from "../db/repositories/applications.repo.js";
import pipelineEventsRepo from "../db/repositories/pipelineEvents.repo.js";

declare const broadcast: (payload: any) => void;

//
// Valid pipeline stages for V1
//
export const VALID_STAGES = [
  "Not Submitted",
  "Received",
  "In Review",
  "Documents Required",
  "Ready for Signing",
  "Off to Lender",
  "Offer",
];

//
// ======================================================
//  Get Pipeline History
// ======================================================
//
export async function getPipeline(applicationId: string) {
  const list = await pipelineEventsRepo.findMany({ applicationId });

  return (await list).sort(
    (a: any, b: any) =>
      new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime(),
  );
}

//
// ======================================================
//  Manually Override Pipeline Stage
// ======================================================
//
export async function updateStage(
  applicationId: string,
  newStage: string,
  reason: string = "Manual update"
) {
  if (!VALID_STAGES.includes(newStage)) {
    throw new Error(`Invalid pipeline stage: ${newStage}`);
  }

  // Fetch current application
  const app = await applicationsRepo.findById(applicationId);

  if (!app) throw new Error("Application not found.");

  // Insert pipeline event
  await pipelineEventsRepo.create({ applicationId, stage: newStage, reason });

  // Update application record
  const updated = await applicationsRepo.update(applicationId, {
    pipelineStage: newStage,
    updatedAt: new Date(),
  });

  // Broadcast to all connected clients
  broadcast({
    type: "pipeline-update",
    applicationId,
    stage: newStage,
    reason,
  });

  return updated;
}

//
// ======================================================
//  Helper: Auto-move pipeline due to signing
//  (Used in Block 11 when signing completes)
// ======================================================
//
export async function markSigned(applicationId: string) {
  return updateStage(applicationId, "Off to Lender", "Client signed application");
}
