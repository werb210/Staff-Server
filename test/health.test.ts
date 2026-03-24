import request from "supertest";
import type { Express } from "express";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/middleware/auth", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => {
    next();
  },
}));

import { createServer } from "../src/server/createServer";

describe("Health", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createServer();
  });

  it("GET /healthz", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /readyz", async () => {
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(200);
  });
});
