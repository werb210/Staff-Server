import request from "supertest";
import type { Express } from "express";

function buildTestApp(): Express {
  const { buildAppWithApiRoutes } = require("../app");
  return buildAppWithApiRoutes();
}

describe("POST /api/auth/otp/start Twilio Verify behaviors", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 503 when Twilio Verify is unavailable", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";

    jest.doMock("twilio", () => {
      return () => ({
        verify: {
          v2: {
            services: () => ({
              verifications: {
                create: () => {
                  const e: any = new Error("Service down");
                  e.status = 503;
                  throw e;
                },
              },
            }),
          },
        },
      });
    });

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(res.status).toBe(503);
  });

  it("returns 204 on successful OTP start", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";
    jest.doMock("twilio", () => {
      return () => ({
        verify: {
          v2: {
            services: () => ({
              verifications: {
                create: async () => ({}),
              },
            }),
          },
        },
      });
    });

    const app = buildTestApp();
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(res.status).toBe(204);
  });
});
