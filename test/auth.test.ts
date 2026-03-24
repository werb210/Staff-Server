import request from "supertest";
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../src/server/createServer";

describe("Auth", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createServer();
  });

  it("rejects unauthenticated", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });
});
