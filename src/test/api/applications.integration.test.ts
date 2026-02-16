import { randomUUID } from "crypto";
import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ROLES, type Role } from "../../auth/roles";
import { pool } from "../../db";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";

let app: Express;
let phoneCounter = 3000;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function createLender(): Promise<string> {
  const lenderId = randomUUID();
  await pool.query(
    `insert into lenders (id, name, country, submission_method, created_at, updated_at)
     values ($1, $2, $3, $4, now(), now())`,
    [lenderId, "Test Lender", "US", "api"]
  );
  return lenderId;
}

async function loginWithRole(role: Role): Promise<{ token: string; userId: string }> {
  const phone = nextPhone();
  const email = `app-${phone.replace(/\\D/g, "")}@example.com`;
  const lenderId = role === ROLES.LENDER ? await createLender() : null;
  await seedUser({
    phoneNumber: phone,
    role,
    lenderId,
    email,
  });

  const res = await request(app).post("/api/auth/login").send({
    phone,
    code: "123456",
  });

  return { token: res.body.accessToken, userId: res.body.user.id };
}

describe("applications integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("creates and fetches an application", async () => {
    const { token } = await loginWithRole(ROLES.STAFF);

    const createRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "client",
        business: { legalName: "Acme Inc", industry: "Retail", country: "US" },
        financialProfile: {
          yearsInBusiness: 4,
          monthlyRevenue: 10000,
          annualRevenue: 100000,
          arOutstanding: 5000,
          existingDebt: false,
        },
        productSelection: {
          requestedProductType: "LOC",
          useOfFunds: "Working capital",
          capitalRequested: 50000,
          equipmentAmount: 0,
        },
        contact: { fullName: "Ava Lee", email: "ava.lee@example.com", phone: "+14155550001" },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      applicationId: expect.any(String),
      pipelineState: expect.any(String),
    });

    const applicationId = createRes.body.applicationId as string;
    const rows = await pool.query<{ id: string }>(
      "select id from applications where id = $1",
      [applicationId]
    );
    expect(rows.rows[0]?.id).toBe(applicationId);

    const fetchRes = await request(app)
      .get(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body).toMatchObject({
      application: {
        id: applicationId,
        pipelineState: expect.any(String),
      },
    });
  });

  it("rejects invalid tokens with 401", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", "Bearer not-a-token")
      .send({
        source: "client",
        business: { legalName: "Invalid Token LLC", industry: "Retail", country: "US" },
        financialProfile: {
          yearsInBusiness: 2,
          monthlyRevenue: 5000,
          annualRevenue: 50000,
          arOutstanding: 2000,
          existingDebt: false,
        },
        productSelection: {
          requestedProductType: "LOC",
          useOfFunds: "Working capital",
          capitalRequested: 20000,
          equipmentAmount: 0,
        },
        contact: { fullName: "Ivy Ng", email: "ivy.ng@example.com", phone: "+14155550002" },
      });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ ok: false, error: "invalid_token" });
  });

  it("enforces role-based access with 403", async () => {
    const { token } = await loginWithRole(ROLES.LENDER);

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "client",
        business: { legalName: "Lender Access LLC", industry: "Retail", country: "US" },
        financialProfile: {
          yearsInBusiness: 3,
          monthlyRevenue: 8000,
          annualRevenue: 80000,
          arOutstanding: 1000,
          existingDebt: false,
        },
        productSelection: {
          requestedProductType: "LOC",
          useOfFunds: "Working capital",
          capitalRequested: 35000,
          equipmentAmount: 0,
        },
        contact: { fullName: "Leo Kim", email: "leo.kim@example.com", phone: "+14155550003" },
      });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ ok: false, error: "forbidden" });
  });
});
