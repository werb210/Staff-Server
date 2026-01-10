import request from "supertest";
import type express from "express";
import type { Pool } from "pg";

const trackRequest = jest.fn();
const trackDependency = jest.fn();
const trackException = jest.fn();
const trackEvent = jest.fn();

jest.mock("../observability/appInsights", () => ({
  trackRequest: (telemetry: unknown) => trackRequest(telemetry),
  trackDependency: (telemetry: unknown) => trackDependency(telemetry),
  trackException: (telemetry: unknown) => trackException(telemetry),
  trackEvent: (telemetry: unknown) => trackEvent(telemetry),
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
  const { setCriticalServicesReady, setDbConnected, setMigrationsState, setSchemaReady } = await import("../startupState");

  app = buildAppWithApiRoutes();
  pool = db.pool;
  await runMigrations();
  await ensureAuditEventSchema();
  setDbConnected(true);
  setMigrationsState([]);
  setSchemaReady(true);
  setCriticalServicesReady(true);
});

beforeEach(() => {
  trackRequest.mockClear();
  trackDependency.mockClear();
  trackException.mockClear();
  trackEvent.mockClear();
});

afterAll(async () => {
  await pool.end();
});

describe("readiness", () => {
  it("always reports readiness without blocking", async () => {
    const requestId = "ready-ok";
    const res = await request(app)
      .get("/api/_int/ready")
      .set("x-request-id", requestId);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).not.toHaveBeenCalled();
  });
});
