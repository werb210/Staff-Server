import request from "supertest";
import type { Express } from "express";
import { getTwilioMocks } from "./helpers/twilioMocks";

function buildTestApp(): Express {
  const { buildAppWithApiRoutes } = require("../app");
  return buildAppWithApiRoutes();
}

describe("POST /api/auth/otp/start", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.TWILIO_ENABLED = "true";
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 200 when Twilio configured", async () => {
    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerification.mockResolvedValueOnce({
      sid: "VE200",
      status: "pending",
    });

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881337" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns 503 when twilio disabled", async () => {
    process.env.TWILIO_ENABLED = "false";
    jest.resetModules();

    const app = buildTestApp();
    const res = await request(app).post("/api/auth/otp/start");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "otp_disabled" });
  });
});
