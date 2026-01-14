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
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 503 when Verify service SID missing", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    jest.resetModules();

    expect(() => buildTestApp()).toThrow(
      "Missing required Twilio environment variables"
    );
  });

  it("returns 204 with CORS headers on preflight", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .options("/api/auth/otp/start")
      .set("Origin", "https://staff.boreal.financial")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "https://staff.boreal.financial"
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
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
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual({ sent: true });
  });

  it("returns 401 when Twilio auth invalid", async () => {
    const twilioMocks = getTwilioMocks();
    const error: any = new Error("Authentication failed");
    error.code = 20003;
    error.status = 401;
    twilioMocks.createVerification.mockRejectedValueOnce(error);

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881337" });

    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "twilio_verify_failed",
      message: "Twilio verification failed",
    });
  });
});
