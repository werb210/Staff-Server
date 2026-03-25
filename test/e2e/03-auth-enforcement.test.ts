import request from "supertest";
import type { Express } from "express";

import { createServer } from "../../src/server/createServer";
import { generateTestToken } from "../utils/token";

interface ProtectedEndpoint {
  method: "get" | "post";
  path: string;
  body?: Record<string, unknown>;
}

describe("Auth enforcement", () => {
  let app: Express;

  beforeAll(() => {
    app = createServer();
  });

  const protectedEndpoints: ProtectedEndpoint[] = [
    { method: "get", path: "/api/applications" },
    { method: "post", path: "/api/applications", body: { amount: 100 } },
    { method: "post", path: "/api/documents/upload", body: { applicationId: "app-1" } },
    { method: "get", path: "/api/offers" },
    { method: "get", path: "/telephony/token" },
  ];

  it("returns 401 without Authorization header", async () => {
    for (const endpoint of protectedEndpoints) {
      const req = request(app)[endpoint.method](endpoint.path);
      const res = endpoint.body ? await req.send(endpoint.body) : await req;
      expect(res.status).toBe(401);
    }
  });

  it("returns 200/201 with valid token", async () => {
    const token = generateTestToken();

    for (const endpoint of protectedEndpoints) {
      const req = request(app)[endpoint.method](endpoint.path).set(
        "Authorization",
        `Bearer ${token}`,
      );
      const res = endpoint.body ? await req.send(endpoint.body) : await req;
      expect([200, 201]).toContain(res.status);
    }
  });

  it("returns 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/applications")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
  });
});
