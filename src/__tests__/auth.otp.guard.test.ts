import request from "supertest";
import type { Express } from "express";

function buildTestApp(): Express {
  const { buildAppWithApiRoutes } = require("../app");
  return buildAppWithApiRoutes();
}

describe("OTP endpoints when Twilio disabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "pg-mem",
      NODE_ENV: "test",
    };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 424 for OTP request", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881337" });

    expect(res.status).toBe(424);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "twilio_unavailable",
      message: "Twilio is not configured.",
    });
  });

  it("returns 424 for OTP verify", async () => {
    const app = buildTestApp();
    const res = await request(app).post("/api/auth/otp/verify").send({
      phone: "+15878881337",
      code: "123456",
    });

    expect(res.status).toBe(424);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "twilio_unavailable",
      message: "Twilio is not configured.",
    });
  });
});
