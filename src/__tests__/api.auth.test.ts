import request from "supertest";
import { buildAppWithApiRoutes } from "../app";

const app = buildAppWithApiRoutes();

describe("API auth JSON responses", () => {
  it("returns JSON for /api/auth/start", async () => {
    const res = await request(app)
      .post("/api/auth/start")
      .send({ phone: "+15878881337" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.success || res.body.error).toBeTruthy();
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });

  it("returns JSON error for /api/auth/verify with invalid code", async () => {
    const res = await request(app)
      .post("/api/auth/verify")
      .send({ phone: "+15878881337", code: "000000" });

    expect([400, 401]).toContain(res.status);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.error).toBeDefined();
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });
});
