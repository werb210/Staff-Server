import request from "supertest";
import type { Express } from "express";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/middleware/auth", () => ({
  requireAuth: (req: { user?: { id: string; role: string } }, _res: unknown, next: () => void) => {
    req.user = { id: "test", role: "admin" };
    next();
  },
}));

vi.mock("../src/modules/lead/lead.service", () => ({
  createLead: vi.fn(async () => ({ id: "lead_test_1" })),
  getLeads: vi.fn(async () => []),
}));

import { createServer } from "../src/server/createServer";

describe("Core domains", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createServer();
  });

  it("creates lead", async () => {
    const res = await request(app)
      .post("/api/leads")
      .set("Authorization", "Bearer test-token")
      .send({ source: "integration-test", name: "Test" });

    expect(res.status).toBe(201);
  });

  it("sends package", async () => {
    const res = await request(app)
      .post("/api/lenders/send")
      .set("Authorization", "Bearer test-token")
      .send({ application: { id: "app-1" }, documents: [], creditSummary: { score: 700 } });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("sent");
  });
});
