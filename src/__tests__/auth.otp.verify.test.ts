import request from "supertest";
import type { Express } from "express";
import { getTwilioMocks } from "./helpers/twilioMocks";

function buildTestApp(): Express {
  const { buildAppWithApiRoutes } = require("../app");
  return buildAppWithApiRoutes();
}

describe("POST /api/auth/otp/start Twilio Verify behaviors", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 503 when TWILIO_ACCOUNT_SID is missing", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "twilio_unavailable",
      message: "Twilio is not configured.",
    });
  });

  it("returns 503 when TWILIO_AUTH_TOKEN is missing", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    delete process.env.TWILIO_AUTH_TOKEN;
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "twilio_unavailable",
      message: "Twilio is not configured.",
    });
  });

  it("returns 503 when TWILIO_VERIFY_SERVICE_SID is missing", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "twilio_unavailable",
      message: "Twilio is not configured.",
    });
  });

  it("returns 200 when Verify succeeds", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerification.mockResolvedValueOnce({
      sid: "VE200",
      status: "pending",
    });

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual({ sent: true });
  });

  it("creates a Twilio client per request", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerification.mockResolvedValue({
      sid: "VE200",
      status: "pending",
    });

    const app = buildTestApp();
    await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });
    await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(twilioMocks.twilioConstructor).toHaveBeenCalledTimes(1);
  });
});
