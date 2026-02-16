import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";
import { ROLES } from "../../auth/roles";

let app: Express;

async function loginStaff(): Promise<string> {
  const phone = `+1415555${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
  const email = `toggle-${phone.replace(/\\D/g, "")}@example.com`;
  await seedUser({ phoneNumber: phone, role: ROLES.STAFF, email });
  const res = await request(app).post("/api/auth/login").send({ phone, code: "123456" });
  expect(res.status).toBe(200);
  expect(res.body.accessToken).toBeTruthy();
  return res.body.accessToken as string;
}

describe("feature toggles integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("disables idempotency enforcement when toggled off", async () => {
    const token = await loginStaff();
    process.env.ENABLE_IDEMPOTENCY = "false";
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "client",
        business: { legalName: `Toggle ${randomUUID()}`, industry: "Retail", country: "US" },
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
        contact: { fullName: "Sam Toggle", email: "sam.toggle@example.com", phone: "+14155550004" },
      });
    expect(res.status).toBe(201);
    delete process.env.ENABLE_IDEMPOTENCY;
  });
});
