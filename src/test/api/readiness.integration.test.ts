import type { Express } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../../db";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";
import { ROLES } from "../../auth/roles";

const { sendSMSMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async () => undefined),
}));

vi.mock("../../services/smsService", () => ({
  sendSMS: sendSMSMock,
}));

let app: Express;

async function login(role: keyof typeof ROLES): Promise<string> {
  const phone = `+1415555${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
  const email = `${role.toLowerCase()}-${phone.replace(/\D/g, "")}@example.com`;
  await seedUser({ phoneNumber: phone, role: ROLES[role], email });
  const response = await request(app).post("/api/auth/login").send({ phone, code: "123456" });
  expect(response.status).toBe(200);
  return response.body.accessToken as string;
}

describe("readiness lead integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    sendSMSMock.mockClear();
  });

  it("creates a readiness lead and links CRM contact without SMS", async () => {
    const response = await request(app)
      .post("/api/public/readiness")
      .send({
        companyName: "Acme Co",
        fullName: "Taylor Smith",
        phone: "(415) 555-1111",
        email: "Taylor@Example.com",
        yearsInBusiness: "1 to 3 Years",
        monthlyRevenue: "$10,001 to $30,000",
        annualRevenue: "$150,001 to $500,000",
        arBalance: "Zero to $100,000",
        collateralAvailable: "$1 to $100,000",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.leadId).toEqual(expect.any(String));

    const readiness = await pool.query(
      "select * from readiness_leads where id = $1",
      [response.body.data.leadId]
    );
    expect(readiness.rows[0]?.email).toBe("taylor@example.com");
    expect(readiness.rows[0]?.phone).toBe("+14155551111");
    expect(readiness.rows[0]?.crm_contact_id).toEqual(expect.any(String));

    const contact = await pool.query("select * from contacts where id = $1", [
      readiness.rows[0]?.crm_contact_id,
    ]);
    expect(contact.rows[0]?.status).toBe("readiness_v1");

    expect(sendSMSMock).not.toHaveBeenCalled();
  });

  it("rejects invalid readiness payloads", async () => {
    const response = await request(app).post("/api/public/readiness").send({
      companyName: "",
      fullName: "A",
      phone: "invalid",
      email: "not-an-email",
    });

    expect(response.status).toBe(400);
  });

  it("reuses existing CRM contact by email or phone", async () => {
    await pool.query(
      `insert into contacts (id, name, email, phone, status, created_at, updated_at)
       values ('11111111-1111-1111-1111-111111111111', 'Existing', 'existing@example.com', '+14155559999', 'prospect', now(), now())`
    );

    const response = await request(app)
      .post("/api/public/readiness")
      .send({
        companyName: "Reused Contact Inc",
        fullName: "Jordan Lee",
        phone: "+1 (415) 555-9999",
        email: "Existing@example.com",
        yearsInBusiness: "Under 1 Year",
        monthlyRevenue: "Under $10,000",
        annualRevenue: "Zero to $150,000",
        arBalance: "No Account Receivables",
        collateralAvailable: "No Collateral Available",
      });

    expect(response.status).toBe(201);

    const readiness = await pool.query("select crm_contact_id from readiness_leads where id = $1", [
      response.body.data.leadId,
    ]);
    expect(readiness.rows[0]?.crm_contact_id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("requires admin auth for portal readiness endpoints", async () => {
    const unauthorized = await request(app).get("/api/portal/readiness-leads");
    expect(unauthorized.status).toBe(401);

    const staffToken = await login("STAFF");
    const forbidden = await request(app)
      .get("/api/portal/readiness-leads")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(forbidden.status).toBe(403);
  });

  it("converts readiness lead to application and fetches by application id", async () => {
    const createRes = await request(app).post("/api/public/readiness").send({
      companyName: "Convert Co",
      fullName: "Chris Doe",
      phone: "+14155552222",
      email: "convert@example.com",
      yearsInBusiness: "Over 3 Years",
      monthlyRevenue: "Over $100,000",
      annualRevenue: "$1,000,001 to $3,000,000",
      arBalance: "$100,000 to $250,000",
      collateralAvailable: "Over $1 million",
    });
    expect(createRes.status).toBe(201);

    const adminToken = await login("ADMIN");

    const convertRes = await request(app)
      .post(`/api/portal/readiness-leads/${createRes.body.data.leadId}/convert`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(convertRes.status).toBe(200);
    expect(convertRes.body.applicationId).toEqual(expect.any(String));

    const lead = await pool.query(
      "select status, application_id from readiness_leads where id = $1",
      [createRes.body.data.leadId]
    );
    expect(lead.rows[0]?.status).toBe("converted");
    expect(lead.rows[0]?.application_id).toBe(convertRes.body.applicationId);

    const readinessRes = await request(app)
      .get(`/api/portal/applications/${convertRes.body.applicationId}/readiness`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(readinessRes.status).toBe(200);
    expect(readinessRes.body.readinessLead.id).toBe(createRes.body.data.leadId);
  });
});
