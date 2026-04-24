import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServer } from "../../src/server/createServer.js";
import { db } from "../../src/db.js";

function bearerToken() {
  const token = jwt.sign({ id: "u1", userId: "u1", role: "Admin" }, process.env.JWT_SECRET || "test-jwt-secret");
  return `Bearer ${token}`;
}

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with user payload when fetchMe resolves", async () => {
    vi.spyOn(db, "query").mockResolvedValue({
      rows: [{
        id: "u1",
        phone: null,
        email: "a@b.com",
        first_name: "a",
        last_name: "b",
        role: "Admin",
        status: "ACTIVE",
        silo: "BF",
        profile_image_url: null,
        o365_access_token: null,
        created_at: null,
        updated_at: null,
        last_login_at: null,
      }],
    } as any);

    const res = await request(createServer()).get("/api/users/me").set("authorization", bearerToken());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "u1" });
  });

  it("returns 500 json when fetchMe returns null and responds quickly", async () => {
    vi.spyOn(db, "query").mockRejectedValue(new Error("column profile_image_url does not exist"));

    const started = Date.now();
    const res = await request(createServer()).get("/api/users/me").set("authorization", bearerToken());
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(5000);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "me_unavailable" });
  });
});
