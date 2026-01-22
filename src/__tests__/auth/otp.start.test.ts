import request from "supertest";
import type { Express } from "express";
import { getTwilioMocks } from "../helpers/twilioMocks";

function buildTestApp(): Express {
  const { buildAppWithApiRoutes } = require("../../app");
  return buildAppWithApiRoutes();
}

describe("POST /api/auth/otp/start", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("calls Twilio Verify with E.164 phone and sms channel", async () => {
    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerification.mockResolvedValueOnce({
      sid: "VE200",
      status: "pending",
    });

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "5878881837" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(twilioMocks.services).toHaveBeenCalledWith(
      process.env.TWILIO_VERIFY_SERVICE_SID
    );
    expect(twilioMocks.createVerification).toHaveBeenCalledWith({
      to: "+15878881837",
      channel: "sms",
    });
  });

  it("fails fast when Twilio env vars are missing", () => {
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    expect(() => buildTestApp()).toThrow(
      "Missing required environment variables: TWILIO_VERIFY_SERVICE_SID"
    );
  });
});
