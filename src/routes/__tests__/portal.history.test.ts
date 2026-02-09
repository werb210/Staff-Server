import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { buildAppWithApiRoutes } from "../../app";
import { pool } from "../../db";
import { createUserAccount } from "../../modules/auth/auth.service";
import { ROLES } from "../../auth/roles";
import { otpVerifyRequest } from "../../__tests__/helpers/otpAuth";
import { createApplication } from "../../modules/applications/applications.repo";
import { randomUUID } from "crypto";

const app = buildAppWithApiRoutes();

async function resetDb(): Promise<void> {
  await pool.query("delete from credit_summary_jobs");
  await pool.query("delete from banking_analysis_jobs");
  await pool.query("delete from document_processing_jobs");
  await pool.query("delete from document_version_reviews");
  await pool.query("delete from document_versions");
  await pool.query("delete from documents");
  await pool.query("delete from application_stage_events");
  await pool.query("delete from applications");
  await pool.query("delete from audit_events");
  await pool.query("delete from users");
}

async function getAdminToken(): Promise<string> {
  const phone = `+1415555${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
  await createUserAccount({
    email: `admin-${randomUUID()}@example.com`,
    phoneNumber: phone,
    role: ROLES.ADMIN,
  });
  const authRes = await otpVerifyRequest(app, { phone });
  return authRes.body.accessToken;
}

describe("portal history endpoints", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("returns ordered application history", async () => {
    const token = await getAdminToken();
    const application = await createApplication({
      ownerUserId: randomUUID(),
      name: "History App",
      metadata: null,
      productType: "standard",
    });
    await pool.query(
      `insert into application_stage_events
       (id, application_id, from_stage, to_stage, trigger, triggered_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        application.id,
        "RECEIVED",
        "IN_REVIEW",
        "manual",
        "system",
        new Date("2024-01-01T00:00:00Z"),
      ]
    );

    const res = await request(app)
      .get(`/api/portal/applications/${application.id}/history`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    const dates = res.body.items.map((item: { occurred_at: string }) =>
      new Date(item.occurred_at).getTime()
    );
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it("enforces read-only views", async () => {
    await expect(
      pool.query(
        `insert into application_pipeline_history_view
         (application_id, from_stage, to_stage, trigger, actor_id, actor_type, occurred_at)
         values ($1, $2, $3, $4, $5, $6, now())`,
        [randomUUID(), "RECEIVED", "IN_REVIEW", "manual", "system", "system"]
      )
    ).rejects.toThrow();
  });

  it("requires staff or admin for job history", async () => {
    const jobId = randomUUID();
    await pool.query(
      `insert into document_processing_jobs
       (id, application_id, document_id, status, created_at, updated_at)
       values ($1, $2, $3, 'pending', now(), now())`,
      [jobId, randomUUID(), randomUUID()]
    );

    const res = await request(app).get(`/api/portal/jobs/${jobId}/history`);
    expect(res.status).toBe(401);
  });
});
