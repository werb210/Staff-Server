import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp";

let app: Express;

describe("health integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("returns ok for /health", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
