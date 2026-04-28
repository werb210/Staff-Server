// BF_BANKING_ANALYSIS_API_v52 — regression test for Bug 5 server-side.
// Verifies GET /api/applications/:id/banking-analysis returns the expected
// shape on success and 404 on missing application.
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../../../db.js", async () => {
  const actual = await vi.importActual<typeof import("../../../db.js")>("../../../db");
  return { ...actual, pool: { query: queryMock } };
});

vi.mock("../../../middleware/auth", async () => {
  const actual = await vi.importActual<typeof import("../../../middleware/auth.js")>(
    "../../../middleware/auth"
  );
  return {
    ...actual,
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = { id: "00000000-0000-0000-0000-000000000001", role: "admin" };
      next();
    },
    requireCapability: () => (_req: any, _res: any, next: any) => next(),
  };
});

vi.mock("../../../middleware/auth.js", async () => {
  const actual = await vi.importActual<typeof import("../../../middleware/auth.js")>(
    "../../../middleware/auth"
  );
  return {
    ...actual,
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = { id: "00000000-0000-0000-0000-000000000001", role: "admin" };
      next();
    },
    requireCapability: () => (_req: any, _res: any, next: any) => next(),
  };
});

describe("BF_BANKING_ANALYSIS_API_v52 GET /api/applications/:id/banking-analysis", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    queryMock.mockReset();
  });

  function token() {
    return jwt.sign({ id: "00000000-0000-0000-0000-000000000001", role: "admin" }, "test-secret");
  }

  async function app() {
    const router = (await import("../applications.routes.js")).default;
    const a = express();
    a.use(express.json());
    a.use("/api/applications", router);
    return a;
  }

  it("returns BankingAnalysis shape with bank counts on success", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: "app-1", banking_completed_at: new Date("2026-04-20T12:00:00Z") }] })
      .mockResolvedValueOnce({ rows: [{ bank_total: "3", bank_completed: "2", any_completed: "2" }] });

    const a = await app();
    const res = await request(a)
      .get("/api/applications/app-1/banking-analysis")
      .set("Authorization", `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      applicationId: "app-1",
      bankingCompletedAt: "2026-04-20T12:00:00.000Z",
      banking_completed_at: "2026-04-20T12:00:00.000Z",
      bankCount: 3,
      documentsAnalyzed: 2,
      status: "analysis_in_progress",
    });
    expect(res.body.monthGroups).toEqual([]);
    expect(res.body.inflows).toBeNull();
  });

  it("404s when the application is not found", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const a = await app();
    const res = await request(a)
      .get("/api/applications/missing/banking-analysis")
      .set("Authorization", `Bearer ${token()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("not_found");
  });

  it("reports no_bank_statements when bankCount is zero", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: "app-2", banking_completed_at: null }] })
      .mockResolvedValueOnce({ rows: [{ bank_total: "0", bank_completed: "0", any_completed: "0" }] });

    const a = await app();
    const res = await request(a)
      .get("/api/applications/app-2/banking-analysis")
      .set("Authorization", `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("no_bank_statements");
    expect(res.body.bankingCompletedAt).toBeNull();
  });
});
