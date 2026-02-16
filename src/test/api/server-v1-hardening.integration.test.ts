import type { Express } from "express";
import request from "supertest";
import { createOrReuseReadinessSession } from "../../modules/readiness/readinessSession.service";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { pool } from "../../db";
import { createTestApp } from "../helpers/testApp";

const { sendSmsMock } = vi.hoisted(() => ({
  sendSmsMock: vi.fn(async () => undefined),
}));

vi.mock("../../modules/notifications/sms.service", () => ({
  sendSms: sendSmsMock,
}));


let app: Express;

describe("server v1 hardening flows", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("creates reusable credit readiness session and dedupes active session per email", async () => {
    const payload = {
      companyName: "North Ridge",
      fullName: "Taylor North",
      phone: "+14155550123",
      email: "taylor.north@example.com",
      industry: "Construction",
      yearsInBusiness: 5,
      monthlyRevenue: 120000,
      annualRevenue: 1440000,
      arBalance: 40000,
      collateralAvailable: true,
    };

    const first = await createOrReuseReadinessSession(payload);
    const second = await createOrReuseReadinessSession(payload);

    expect(first.sessionId).toEqual(expect.any(String));
    expect(first.token).toEqual(expect.any(String));
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.token).toBe(first.token);

    const sessions = await pool.query(
      `select id from readiness_sessions where lower(email) = lower($1) and is_active = true`,
      [payload.email]
    );
    expect(sessions.rowCount).toBe(1);
  });

  it("dedupes CRM lead for confidence checks by email/phone and appends activities", async () => {
    const payload = {
      companyName: "Signal Co",
      fullName: "Jordan Signal",
      email: "signal@example.com",
      phone: "+14155550999",
      monthlyRevenue: 30000,
      yearsInBusiness: 3,
    };

    const one = await request(app).post("/api/ai/confidence").send(payload);
    const two = await request(app).post("/api/ai/confidence").send(payload);

    expect(one.status).toBe(200);
    expect(two.status).toBe(200);

    const leads = await pool.query(
      `select id from crm_leads where lower(email)=lower($1) or regexp_replace(phone, '\\D','','g') = regexp_replace($2, '\\D','','g')`,
      [payload.email, payload.phone]
    );
    expect(leads.rowCount).toBe(1);

    const activities = await pool.query(
      `select id from crm_lead_activities where lead_id = $1 and activity_type = 'confidence_check'`,
      [leads.rows[0].id]
    );
    expect(activities.rowCount).toBe(2);
  });

  it("dedupes CRM lead when email/phone combinations vary", async () => {
    const base = {
      companyName: "Blend Works",
      fullName: "Casey Blend",
      source: "website_contact",
    };

    const sameEmailNewPhone = await request(app).post("/api/contact").send({
      ...base,
      email: "casey.blend@example.com",
      phone: "+14155550011",
    });
    const samePhoneNewEmail = await request(app).post("/api/contact").send({
      ...base,
      email: "casey.alt@example.com",
      phone: "+14155550011",
    });
    const sameBoth = await request(app).post("/api/contact").send({
      ...base,
      email: "casey.blend@example.com",
      phone: "+14155550011",
    });

    expect(sameEmailNewPhone.status).toBe(200);
    expect(samePhoneNewEmail.status).toBe(200);
    expect(sameBoth.status).toBe(200);

    const leads = await pool.query(
      `select id from crm_leads where lower(email) in (lower($1), lower($2))
         or regexp_replace(phone, '\D','','g') = regexp_replace($3, '\D','','g')`,
      ["casey.blend@example.com", "casey.alt@example.com", "+14155550011"]
    );

    expect(leads.rowCount).toBe(1);
  });

  it("hardens website credit readiness bridge with enum validation and bridge token payload", async () => {
    const payload = {
      companyName: "Bridge Safe LLC",
      fullName: "Morgan Bridge",
      phone: "+14155553333",
      email: "bridge.safe@example.com",
      industry: "Logistics",
      yearsInBusiness: "1 to 3 Years",
      monthlyRevenue: "$10,001 to $30,000",
      annualRevenue: "$150,001 to $500,000",
      arBalance: "Zero to $100,000",
      availableCollateral: "$1 to $100,000",
    };

    const invalid = await request(app)
      .post("/api/website/credit-readiness")
      .set("Idempotency-Key", "website-credit-invalid")
      .send({ ...payload, yearsInBusiness: "Twenty years" });

    expect(invalid.status).toBe(400);

    const first = await request(app)
      .post("/api/website/credit-readiness")
      .set("Idempotency-Key", "website-credit-first")
      .send(payload);
    const second = await request(app)
      .post("/api/website/credit-readiness")
      .set("Idempotency-Key", "website-credit-second")
      .send({ ...payload, phone: "+14155554444" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.success).toBe(true);
    expect(first.body.leadId).toEqual(expect.any(String));
    expect(first.body.continuationToken).toEqual(expect.any(String));
    expect(first.body.bridgeToken).toEqual(expect.any(String));

    const decoded = JSON.parse(Buffer.from(first.body.bridgeToken as string, "base64").toString("utf-8")) as Record<string, unknown>;
    expect(decoded.companyName).toBe(payload.companyName);
    expect(decoded.yearsInBusiness).toBe(payload.yearsInBusiness);
    expect(decoded.collateral).toBe(payload.availableCollateral);
    expect(decoded.continuationToken).toBe(first.body.continuationToken);

    const leads = await pool.query(
      `select id from crm_leads where lower(email)=lower($1)`,
      [payload.email]
    );
    expect(leads.rowCount).toBe(1);

    const activities = await pool.query(
      `select payload from crm_lead_activities where lead_id = $1 and activity_type = 'credit_readiness_submission' order by created_at asc`,
      [leads.rows[0].id]
    );

    expect(activities.rowCount).toBe(2);
    expect(activities.rows[0].payload?.status).toBe("Pre-Application");
    expect(activities.rows[0].payload?.normalizedCollateral).toBe(payload.availableCollateral);

    expect(sendSmsMock).toHaveBeenCalledTimes(0);
  });

});
