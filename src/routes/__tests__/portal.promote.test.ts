import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { buildAppWithApiRoutes } from "../../app";
import { pool } from "../../db";
import { createUserAccount } from "../../modules/auth/auth.service";
import { ROLES } from "../../auth/roles";
import { otpVerifyRequest } from "../../__tests__/helpers/otpAuth";
import { createApplication } from "../../modules/applications/applications.repo";
import { ApplicationStage } from "../../modules/applications/pipelineState";
import { randomUUID } from "crypto";

const app = buildAppWithApiRoutes();

async function resetDb(): Promise<void> {
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

describe("portal promote endpoint", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects invalid transitions", async () => {
    const token = await getAdminToken();
    const application = await createApplication({
      ownerUserId: randomUUID(),
      name: "Promote App",
      metadata: null,
      productType: "standard",
    });

    const res = await request(app)
      .post(`/api/portal/applications/${application.id}/promote`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nextStage: ApplicationStage.OFF_TO_LENDER, reason: "skip" });

    expect(res.status).toBe(400);
  });

  it("requires a reason", async () => {
    const token = await getAdminToken();
    const application = await createApplication({
      ownerUserId: randomUUID(),
      name: "Promote App",
      metadata: null,
      productType: "standard",
    });

    const res = await request(app)
      .post(`/api/portal/applications/${application.id}/promote`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nextStage: ApplicationStage.IN_REVIEW });

    expect(res.status).toBe(400);
  });

  it("creates an audit entry on promotion", async () => {
    const token = await getAdminToken();
    const application = await createApplication({
      ownerUserId: randomUUID(),
      name: "Promote App",
      metadata: null,
      productType: "standard",
    });

    const res = await request(app)
      .post(`/api/portal/applications/${application.id}/promote`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nextStage: ApplicationStage.IN_REVIEW, reason: "manual move" });

    expect(res.status).toBe(200);
    const audit = await pool.query(
      `select id from audit_events where event_action = 'application_promoted'`
    );
    expect(audit.rows.length).toBeGreaterThan(0);
  });
});
