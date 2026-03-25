import request from "supertest";
import type { Express } from "express";

import { createServer } from "../../src/server/createServer";
import { clearJwtSecretForAuthFailure } from "../utils/testEnv";

describe("OTP flows", () => {
  let app: Express;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    app = createServer();
  });

  it("starts OTP flow", async () => {
    const res = await request(app)
      .post("/auth/otp/start")
      .send({ phone: "+15555550100" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("verifies OTP and returns a token", async () => {
    const res = await request(app)
      .post("/auth/otp/verify")
      .send({ phone: "+15555550100", code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects invalid OTP payload", async () => {
    const res = await request(app)
      .post("/auth/otp/verify")
      .send({ phone: "bad-phone", code: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_payload");
  });

  it("returns unauthorized when JWT secret is unavailable", async () => {
    clearJwtSecretForAuthFailure();

    const res = await request(app)
      .post("/auth/otp/verify")
      .send({ phone: "+15555550100", code: "123456" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthorized");
  });

  it("tracks missing OTP expiry protection (expected failure to expose gap)", async () => {
    // Current implementation does not persist OTP state or enforce expiry windows.
    // This test intentionally fails to expose that missing behavior.
    const res = await request(app)
      .post("/auth/otp/verify")
      .send({ phone: "+15555550100", code: "123456" });

    expect(res.status).toBe(410);
  });
});
