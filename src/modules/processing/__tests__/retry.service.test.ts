import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { pool } from "../../../db";
import { retryProcessingJob } from "../retry.service";
import { createUserAccount } from "../../auth/auth.service";
import { ROLES } from "../../../auth/roles";
import { createApplication } from "../../applications/applications.repo";
import { getCircuitBreaker } from "../../../utils/circuitBreaker";

async function resetDb(): Promise<void> {
  await pool.query("delete from credit_summary_jobs");
  await pool.query("delete from banking_analysis_jobs");
  await pool.query("delete from document_processing_jobs");
  await pool.query("delete from application_stage_events");
  await pool.query("delete from applications");
  await pool.query("delete from users");
  await pool.query("delete from audit_events");
}

describe("retryProcessingJob", () => {
  let userId: string;
  let applicationId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(async () => {
    await resetDb();
    const user = await createUserAccount({
      email: `admin-${randomUUID()}@example.com`,
      phoneNumber: "+14155550000",
      role: ROLES.ADMIN,
    });
    userId = user.id;
    const application = await createApplication({
      ownerUserId: userId,
      name: "Retry App",
      metadata: null,
      productType: "standard",
    });
    applicationId = application.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("increments retry count", async () => {
    const jobId = randomUUID();
    await pool.query(
      `insert into document_processing_jobs
       (id, application_id, document_id, status, retry_count, max_retries, created_at, updated_at)
       values ($1, $2, $3, 'failed', 0, 3, now(), now())`,
      [jobId, applicationId, randomUUID()]
    );

    const job = await retryProcessingJob({
      jobId,
      actorUserId: userId,
      actorRole: ROLES.ADMIN,
    });

    expect(job.retryCount).toBe(1);
    expect(job.status).toBe("pending");
  });

  it("stops at max retries", async () => {
    const jobId = randomUUID();
    await pool.query(
      `insert into banking_analysis_jobs
       (id, application_id, status, retry_count, max_retries, created_at, updated_at)
       values ($1, $2, 'failed', 2, 2, now(), now())`,
      [jobId, applicationId]
    );

    await expect(
      retryProcessingJob({
        jobId,
        actorUserId: userId,
        actorRole: ROLES.ADMIN,
      })
    ).rejects.toThrow("Max retries reached.");
  });

  it("blocks retry when circuit is open", async () => {
    const jobId = randomUUID();
    await pool.query(
      `insert into document_processing_jobs
       (id, application_id, document_id, status, retry_count, max_retries, created_at, updated_at)
       values ($1, $2, $3, 'failed', 0, 3, now(), now())`,
      [jobId, applicationId, randomUUID()]
    );
    const breaker = getCircuitBreaker("ocr_job_creation", {
      failureThreshold: 3,
      cooldownMs: 60_000,
    });
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    await expect(
      retryProcessingJob({
        jobId,
        actorUserId: userId,
        actorRole: ROLES.ADMIN,
      })
    ).rejects.toThrow("OCR circuit breaker is open.");
    breaker.recordSuccess();
  });
});
