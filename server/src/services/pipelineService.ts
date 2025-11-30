// server/src/services/pipelineService.ts
import { db } from "../db/db.js";
import { applications } from "../db/schema/applications.js";
import { pipelineEvents } from "../db/schema/pipeline.js";
import { eq } from "drizzle-orm";

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
  const list = await db
    .select()
    .from(pipelineEvents)
    .where(eq(pipelineEvents.applicationId, applicationId))
    .orderBy(pipelineEvents.createdAt);

  return list;
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
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));

  if (!app) throw new Error("Application not found.");

  // Insert pipeline event
  await db.insert(pipelineEvents).values({
    applicationId,
    stage: newStage,
    reason,
  });

  // Update application record
  const [updated] = await db
    .update(applications)
    .set({
      pipelineStage: newStage,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))
    .returning();

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
