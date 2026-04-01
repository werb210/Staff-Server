import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import { signJwt } from "../auth/jwt";
import { CAPABILITIES } from "../auth/capabilities";
import { pool } from "../db";

describe("server:contract:e2e", () => {
  const authHeader = () =>
    `Bearer ${signJwt({
      userId: "test-user",
      role: "Admin",
      capabilities: [CAPABILITIES.COMMUNICATIONS_CALL],
    })}`;

  beforeEach(() => {
    vi.spyOn(pool, "query").mockResolvedValue({ rows: [{ count: "0" }] } as never);
  });

  function expectContractEnvelope(body: any) {
    expect(body).toHaveProperty("status");
    if (body.status === "ok") {
      expect(body).toHaveProperty("data");
      return;
    }

    expect(body).toHaveProperty("error");
  }

  it("supports canonical dialer token route", async () => {
    const res = await request(app)
      .get("/dialer/token")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expectContractEnvelope(res.body);
  });

  it("supports canonical call start route", async () => {
    const res = await request(app)
      .post("/call/start")
      .set("Authorization", authHeader())
      .send({ to: "+61400000000" });

    expect(res.status).toBe(200);
    expectContractEnvelope(res.body);
  });

  it("supports canonical voice status route", async () => {
    const res = await request(app)
      .post("/voice/status")
      .set("Authorization", authHeader())
      .send({ callId: "call-123", status: "completed" });

    expect(res.status).toBe(200);
    expectContractEnvelope(res.body);
  });
});
