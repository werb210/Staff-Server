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
        country: "US",
        productCategory: "LOC",
        business: { legalName: `Toggle ${randomUUID()}` },
        applicant: {
          firstName: "Sam",
          lastName: "Toggle",
          email: "sam.toggle@example.com",
        },
        financialProfile: { revenue: 100000 },
        match: { partner: "direct" },
      });
    expect(res.status).toBe(201);
    delete process.env.ENABLE_IDEMPOTENCY;
  });
});
