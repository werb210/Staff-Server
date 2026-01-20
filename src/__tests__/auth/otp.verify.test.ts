import request from "supertest";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import { createUserAccount } from "../../modules/auth/auth.service";
import { ROLES } from "../../auth/roles";

function buildTestApp(): Express {
  const { buildAppWithApiRoutes } = require("../../app");
  return buildAppWithApiRoutes();
}

describe("POST /api/auth/otp/verify", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects invalid OTP codes", async () => {
    const phone = `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
    await createUserAccount({
      email: "otp-invalid@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phone, code: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "invalid_code",
      message: "Invalid or expired code",
    });
  });

  it("accepts approved codes and returns a JWT", async () => {
    const phone = `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
    await createUserAccount({
      email: "otp-approved@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phone, code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({
      role: ROLES.STAFF,
    });

    const payload = jwt.decode(res.body.accessToken) as { role?: string } | null;
    expect(payload?.role).toBe(ROLES.STAFF);
  });
});
