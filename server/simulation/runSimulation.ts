/**
 * BLOCK 24
 * End-to-End Server Simulation Harness
 *
 * This file creates a controlled simulation environment:
 *  - Creates fake application
 *  - Uploads fake document buffer
 *  - Triggers Azure Blob upload
 *  - Triggers OCR service
 *  - Triggers Banking Analysis
 *  - Chooses lender products
 *  - Creates pipeline event
 *  - Sends notification
 *  - Logs audit event
 */

import { db } from "../src/db/db.js";
import { randomUUID } from "crypto";
import { getContainer } from "../src/utils/blob.js";
import ocrService from "../src/services/ocrService.js";
import bankingService from "../src/services/bankingService.js";
import productsService from "../src/services/productsService.js";
import pipelineService from "../src/services/pipelineService.js";
import notificationsService from "../src/services/notificationsService.js";
import auditService from "../src/services/auditService.js";
import documentService from "../src/services/documentsService.js";

async function run() {
  console.log("→ Starting simulation...");

  const appId = randomUUID();
  const userId = randomUUID();

  console.log("→ Creating fake application...");
  await db.insert(db.applications).values({
    id: appId,
    businessName: "Simulated Co",
    contactEmail: "test@example.com",
    createdBy: userId
  });

  console.log("→ Uploading fake document buffer to Azure...");
  const container = getContainer();
  const blobName = `simulation-${Date.now()}.txt`;

  const buffer = Buffer.from("SIMULATED DOCUMENT CONTENT");
  await container.uploadBlockBlob(blobName, buffer, buffer.length);

  console.log("→ Recording document in DB...");
  const docId = randomUUID();
  await db.insert(db.documents).values({
    id: docId,
    applicationId: appId,
    azureBlobKey: blobName,
    mimeType: "text/plain",
    sizeBytes: buffer.length,
    status: "uploaded"
  });

  console.log("→ Running OCR...");
  await ocrService.process(docId);

  console.log("→ Running Banking Analysis...");
  await bankingService.analyze(appId);

  console.log("→ Running Lender Recommendation...");
  const lenders = await productsService.recommendForApplication(appId);
  console.log("   Found lenders:", lenders.length);

  console.log("→ Adding Pipeline Event...");
  await pipelineService.addEvent(appId, "simulation_event", {
    message: "Simulation passed lender engine."
  });

  console.log("→ Sending Notification...");
  await notificationsService.send({
    userId,
    title: "Simulation successful",
    message: "Full pipeline executed."
  });

  console.log("→ Recording Audit Event...");
  await auditService.log(userId, "simulation", `Simulation completed for ${appId}`);

  console.log("=== SIMULATION COMPLETE ===");
}

run().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
