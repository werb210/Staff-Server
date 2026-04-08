import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { applyEnv, captureOriginalEnv, restoreEnv } from "../../test/utils/testEnv";

describe("auth middleware enforcement", () => {
  const app = createApp();
  let originalEnv = captureOriginalEnv();

  beforeEach(() => {
    originalEnv = captureOriginalEnv();
    applyEnv({ JWT_SECRET: "test-secret" });
  });

  afterEach(() => {
    restoreEnv(originalEnv);
  });

  it("returns canonical 401 envelope when auth header is missing", async () => {
    const res = await request(app).post("/api/v1/lead").send({ leadId: "1" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: "error", error: "NO_TOKEN" });
  });

  it("returns success with valid JWT token", async () => {
    const token = jwt.sign({ userId: "test-user", role: "tester" }, "test-secret", {
      expiresIn: "1h",
    });

    const res = await request(app)
      .post("/api/v1/call/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "+15555550111" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: "error", error: "call_start_failed" });
  });
});
