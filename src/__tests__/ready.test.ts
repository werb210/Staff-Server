import request from "supertest";
import type express from "express";
import type { Pool } from "pg";

const trackRequest = jest.fn();
const trackDependency = jest.fn();
const trackException = jest.fn();

jest.mock("../observability/appInsights", () => ({
  trackRequest: (telemetry: unknown) => trackRequest(telemetry),
  trackDependency: (telemetry: unknown) => trackDependency(telemetry),
  trackException: (telemetry: unknown) => trackException(telemetry),
  initializeAppInsights: jest.fn(),
}));

let app: express.Express;
let pool: Pool;

function expectRequestId(res: request.Response, requestId: string): void {
  expect(res.headers["x-request-id"]).toBe(requestId);
  if (res.body?.requestId) {
    expect(res.body.requestId).toBe(requestId);
  }
}

function expectNoStackTrace(res: request.Response): void {
  expect(res.body?.stack).toBeUndefined();
  expect(JSON.stringify(res.body)).not.toMatch(/\n\s*at /);
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "pg-mem";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";

  jest.resetModules();
  const { buildAppWithApiRoutes } = await import("../app");
  const { runMigrations } = await import("../migrations");
  const db = await import("../db");
  const { ensureAuditEventSchema } = await import("./helpers/auditSchema");
  const { setDbConnected } = await import("../startupState");

  app = buildAppWithApiRoutes();
  pool = db.pool;
  await runMigrations();
  await ensureAuditEventSchema();
  setDbConnected(true);
});

beforeEach(() => {
  trackRequest.mockClear();
  trackDependency.mockClear();
  trackException.mockClear();
});

afterAll(async () => {
  await pool.end();
});

describe("readiness toggles", () => {
  it("reflects pool availability in readiness", async () => {
    const { setDbTestPoolMetricsOverride } = await import("../db");
    setDbTestPoolMetricsOverride({ idleCount: 1 });

    const okRequestId = "ready-ok";
    const okRes = await request(app)
      .get("/api/_int/ready")
      .set("x-request-id", okRequestId);

    expect(okRes.status).toBe(200);
    expect(okRes.body.ok).toBe(true);
    expectRequestId(okRes, okRequestId);
    expect(trackDependency).toHaveBeenCalled();

    setDbTestPoolMetricsOverride({ idleCount: 0 });
    const downRequestId = "ready-down";
    const downRes = await request(app)
      .get("/api/_int/ready")
      .set("x-request-id", downRequestId);

    expect(downRes.status).toBe(503);
    expect(downRes.body.code).toBe("service_unavailable");
    expectRequestId(downRes, downRequestId);
    expectNoStackTrace(downRes);
    expect(trackDependency).toHaveBeenCalled();

    setDbTestPoolMetricsOverride({ idleCount: 1 });
    const recoveryRequestId = "ready-recover";
    const recoveryRes = await request(app)
      .get("/api/_int/ready")
      .set("x-request-id", recoveryRequestId);

    expect(recoveryRes.status).toBe(200);
    expect(recoveryRes.body.ok).toBe(true);
    expectRequestId(recoveryRes, recoveryRequestId);
    expect(trackDependency).toHaveBeenCalled();
  });
});
