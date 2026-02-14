import type { Express } from "express";
import request from "supertest";
import { createOrReuseReadinessSession } from "../../modules/readiness/readinessSession.service";
import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../db";
import { createTestApp } from "../helpers/testApp";


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
      arOutstanding: 40000,
      existingDebt: true,
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

});
