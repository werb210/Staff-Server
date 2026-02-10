import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { pool } from "../../db";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";
import { ROLES } from "../../auth/roles";
import { createApplication, createDocument } from "../../modules/applications/applications.repo";

let app: Express;

async function loginAdmin(): Promise<string> {
  const phone = `+1415555${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
  const email = `portal-${phone.replace(/\\D/g, "")}@example.com`;
  await seedUser({ phoneNumber: phone, role: ROLES.ADMIN, email });
  const res = await request(app).post("/api/auth/login").send({ phone, code: "123456" });
  expect(res.status).toBe(200);
  expect(res.body.accessToken).toBeTruthy();
  return res.body.accessToken as string;
}

async function seedOwner(): Promise<string> {
  const phone = `+1415555${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
  const email = `owner-${phone.replace(/\\D/g, "")}@example.com`;
  const user = await seedUser({ phoneNumber: phone, role: ROLES.STAFF, email });
  return user.id;
}

describe("portal history integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("supports pagination and filters for application history", async () => {
    const token = await loginAdmin();
    const ownerUserId = await seedOwner();
    const application = await createApplication({
      ownerUserId,
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
    await pool.query(
      `insert into application_stage_events
       (id, application_id, from_stage, to_stage, trigger, triggered_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        application.id,
        "IN_REVIEW",
        "DOCUMENTS_REQUIRED",
        "system",
        "system",
        new Date("2024-01-02T00:00:00Z"),
      ]
    );

    const res = await request(app)
      .get(`/api/portal/applications/${application.id}/history`)
      .set("Authorization", `Bearer ${token}`)
      .query({ trigger: "manual", limit: 1, offset: 0 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].trigger).toBe("manual");
  });

  it("returns document history entries", async () => {
    const token = await loginAdmin();
    const ownerUserId = await seedOwner();
    const application = await createApplication({
      ownerUserId,
      name: "History Docs App",
      metadata: null,
      productType: "standard",
    });
    const document = await createDocument({
      applicationId: application.id,
      ownerUserId: application.owner_user_id,
      title: "Statement",
      documentType: "bank_statements_6_months",
      filename: "bank.pdf",
      uploadedBy: "client",
    });

    const res = await request(app)
      .get(`/api/portal/documents/${document.id}/history`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].document_id).toBe(document.id);
  });

  it("disables audit history when the toggle is off", async () => {
    const token = await loginAdmin();
    const ownerUserId = await seedOwner();
    const application = await createApplication({
      ownerUserId,
      name: "Audit Disabled App",
      metadata: null,
      productType: "standard",
    });
    process.env.ENABLE_AUDIT_HISTORY = "false";
    const res = await request(app)
      .get(`/api/portal/applications/${application.id}/history`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    delete process.env.ENABLE_AUDIT_HISTORY;
  });
});
