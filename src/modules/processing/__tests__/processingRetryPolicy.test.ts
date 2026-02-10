import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { pool } from "../../../db";
import { createUserAccount } from "../../auth/auth.service";
import { ROLES } from "../../../auth/roles";
import { createApplication, createDocument } from "../../applications/applications.repo";
import { createDocumentProcessingJob } from "../processing.service";
import { seedLenderProduct } from "../../../test/helpers/lenders";

async function resetDb(): Promise<void> {
  await pool.query("delete from document_processing_jobs");
  await pool.query("delete from documents");
  await pool.query("delete from application_stage_events");
  await pool.query("delete from applications");
  await pool.query("delete from users");
}

describe("processing retry policy", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("requeues failed OCR jobs when retry policy allows", async () => {
    const user = await createUserAccount({
      email: `retry-${randomUUID()}@example.com`,
      phoneNumber: "+14155551234",
      role: ROLES.ADMIN,
    });
    const { lenderId, productId } = await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const application = await createApplication({
      ownerUserId: user.id,
      name: "Retry Policy App",
      metadata: null,
      productType: "LOC",
      lenderId,
      lenderProductId: productId,
    });
    const document = await createDocument({
      applicationId: application.id,
      ownerUserId: user.id,
      title: "Bank Statement",
      documentType: "bank_statements_6_months",
      filename: "bank.pdf",
      uploadedBy: "client",
    });
    const jobId = randomUUID();
    await pool.query(
      `insert into document_processing_jobs
       (id, application_id, document_id, status, retry_count, max_retries, last_retry_at, created_at, updated_at)
       values ($1, $2, $3, 'failed', 0, 3, now() - interval '2 hours', now(), now())`,
      [jobId, application.id, document.id]
    );

    const job = await createDocumentProcessingJob(application.id, document.id);
    expect(job.status).toBe("pending");
    expect(job.retry_count ?? 0).toBe(1);
  });
});
