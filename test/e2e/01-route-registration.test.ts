import request from "supertest";
import type { Express } from "express";

import { createServer } from "../../src/server/createServer";

interface RouteCheck {
  method: "get" | "post";
  path: string;
  expectedStatus: number;
  body?: Record<string, unknown>;
}

describe("Route registration and prefix integrity", () => {
  let app: Express;

  beforeAll(() => {
    app = createServer();
  });

  it("registers core public and protected routes with expected prefixes", async () => {
    const routeChecks: RouteCheck[] = [
      { method: "get", path: "/health", expectedStatus: 200 },
      { method: "post", path: "/auth/otp/start", expectedStatus: 200, body: { phone: "+15555550100" } },
      { method: "post", path: "/api/applications", expectedStatus: 401, body: {} },
      { method: "get", path: "/api/offers", expectedStatus: 401 },
      { method: "post", path: "/api/documents/upload", expectedStatus: 401, body: {} },
      { method: "get", path: "/telephony/token", expectedStatus: 401 },
    ];

    for (const check of routeChecks) {
      const req = request(app)[check.method](check.path);
      const res = check.body ? await req.send(check.body) : await req;
      expect(res.status).toBe(check.expectedStatus);
    }
  });

  it("rejects malformed prefixed paths with 404", async () => {
    const malformedPaths = ["/api/api/applications", "/api/auth/otp/start", "/auth/auth/otp/start"];

    for (const path of malformedPaths) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
    }
  });
});
