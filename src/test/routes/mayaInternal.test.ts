import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

async function buildTestApp() {
  const { default: mayaInternalRoutes } = await import("../../routes/mayaInternal");
  const app = express();
  app.use("/api/maya", mayaInternalRoutes);
  return app;
}

describe("mayaInternal routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MAYA_INTERNAL_TOKEN;
  });

  it("rejects requests with missing maya token", async () => {
    process.env.PORT ||= "3001";
    process.env.MAYA_INTERNAL_TOKEN = "secret-token";
    const app = await buildTestApp();

    const res = await request(app).get("/api/maya/pipeline");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns pipeline summary with valid token", async () => {
    process.env.PORT ||= "3001";
    process.env.MAYA_INTERNAL_TOKEN = "secret-token";
    const { db } = await import("../../db");
    vi.spyOn(db, "query").mockResolvedValue({
      rows: [{ status: "submitted", count: 2 }],
    } as never);

    const app = await buildTestApp();
    const res = await request(app)
      .get("/api/maya/pipeline")
      .set("x-maya-token", "secret-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ status: "submitted", count: 2 }]);
  });
});
