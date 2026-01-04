import request from "supertest";
import { randomUUID } from "crypto";
import { buildApp } from "../index";
import { pool } from "../db";
import { runMigrations } from "../migrations";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { listDailyMetrics } from "../modules/reporting/dailyMetrics.service";
import {
  runDailyMetricsJob,
  runLenderPerformanceJob,
  runPipelineSnapshotJob,
} from "../modules/reporting/reporting.jobs";

const app = buildApp();

async function resetDb(): Promise<void> {
  await pool.query("delete from reporting_lender_performance");
  await pool.query("delete from reporting_pipeline_snapshots");
  await pool.query("delete from reporting_daily_metrics");
  await pool.query("delete from lender_submissions");
  await pool.query("delete from document_version_reviews");
  await pool.query("delete from document_versions");
  await pool.query("delete from documents");
  await pool.query("delete from applications");
  await pool.query("delete from idempotency_keys");
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from password_resets");
  await pool.query("delete from audit_events");
  await pool.query("delete from users");
}

beforeAll(async () => {
  process.env.DATABASE_URL = "pg-mem";
  process.env.BUILD_TIMESTAMP = "2024-01-01T00:00:00.000Z";
  process.env.COMMIT_SHA = "test-commit";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";
  process.env.LOGIN_LOCKOUT_THRESHOLD = "2";
  process.env.LOGIN_LOCKOUT_MINUTES = "10";
  process.env.PASSWORD_MAX_AGE_DAYS = "30";
  process.env.NODE_ENV = "test";
  await runMigrations();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

async function seedReportingData(): Promise<{ ownerId: string }> {
  const owner = await createUserAccount({
    email: "owner@reports.test",
    password: "Password123!",
    role: ROLES.USER,
  });

  const baseDate = new Date("2024-02-01T10:00:00.000Z");
  const applicationIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const states = ["LENDER_SUBMITTED", "APPROVED", "DECLINED", "FUNDED"];

  await Promise.all(
    applicationIds.map((id, index) =>
      pool.query(
        `insert into applications
         (id, owner_user_id, name, metadata, product_type, pipeline_state, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          id,
          owner.id,
          `App ${index}`,
          null,
          "standard",
          states[index],
          baseDate,
        ]
      )
    )
  );

  const documentId = randomUUID();
  await pool.query(
    `insert into documents
     (id, application_id, owner_user_id, title, document_type, created_at)
     values ($1, $2, $3, $4, $5, $6)`,
    [documentId, applicationIds[0], owner.id, "Bank Statement", "bank_statement", baseDate]
  );

  const versionIds = [randomUUID(), randomUUID()];
  await pool.query(
    `insert into document_versions
     (id, document_id, version, metadata, content, created_at)
     values ($1, $2, $3, $4, $5, $6),
            ($7, $2, $8, $4, $9, $6)`,
    [
      versionIds[0],
      documentId,
      1,
      JSON.stringify({ file: "v1" }),
      "content1",
      baseDate,
      versionIds[1],
      2,
      "content2",
    ]
  );

  await pool.query(
    `insert into document_version_reviews
     (id, document_version_id, status, reviewed_by_user_id, reviewed_at)
     values ($1, $2, $3, $4, $5)`,
    [randomUUID(), versionIds[0], "accepted", owner.id, baseDate]
  );

  await pool.query(
    `insert into lender_submissions
     (id, application_id, status, idempotency_key, lender_id, submitted_at, payload, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $6, $6)`,
    [
      randomUUID(),
      applicationIds[0],
      "submitted",
      randomUUID(),
      "lender-a",
      baseDate,
      JSON.stringify({}),
    ]
  );

  return { ownerId: owner.id };
}

describe("reporting", () => {
  it("aggregates daily metrics correctly", async () => {
    await seedReportingData();
    const metrics = await listDailyMetrics({
      from: new Date("2024-02-01T00:00:00.000Z"),
      to: new Date("2024-02-02T00:00:00.000Z"),
      groupBy: "day",
      limit: 10,
      offset: 0,
    });

    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      applicationsCreated: 4,
      applicationsSubmitted: 1,
      applicationsApproved: 1,
      applicationsDeclined: 1,
      applicationsFunded: 1,
      documentsUploaded: 2,
      documentsApproved: 1,
      lenderSubmissions: 1,
    });
  });

  it("enforces reporting access roles", async () => {
    await createUserAccount({
      email: "user@reports.test",
      password: "Password123!",
      role: ROLES.USER,
    });
    await createUserAccount({
      email: "staff@reports.test",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const userLogin = await request(app).post("/api/auth/login").send({
      email: "user@reports.test",
      password: "Password123!",
    });
    const staffLogin = await request(app).post("/api/auth/login").send({
      email: "staff@reports.test",
      password: "Password123!",
    });

    const forbidden = await request(app)
      .get("/api/reports/overview")
      .set("Authorization", `Bearer ${userLogin.body.accessToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get("/api/reports/overview")
      .set("Authorization", `Bearer ${staffLogin.body.accessToken}`);
    expect(allowed.status).toBe(200);
  });

  it("runs reporting jobs idempotently", async () => {
    await seedReportingData();
    const runDate = new Date("2024-02-02T05:00:00.000Z");

    await runDailyMetricsJob(runDate);
    await runDailyMetricsJob(runDate);

    const dailyCount = await pool.query<{ count: string }>(
      "select count(*) from reporting_daily_metrics where metric_date = $1",
      ["2024-02-02"]
    );
    expect(Number(dailyCount.rows[0].count)).toBe(1);

    await runPipelineSnapshotJob(runDate);
    await runPipelineSnapshotJob(runDate);

    const expectedSnapshots = await pool.query<{ count: string }>(
      "select count(distinct pipeline_state) from applications"
    );
    const snapshotCount = await pool.query<{ count: string }>(
      "select count(*) from reporting_pipeline_snapshots where snapshot_at = $1",
      ["2024-02-02T05:00:00.000Z"]
    );
    expect(Number(snapshotCount.rows[0].count)).toBe(
      Number(expectedSnapshots.rows[0].count)
    );

    await runLenderPerformanceJob(runDate);
    await runLenderPerformanceJob(runDate);

    const lenderCount = await pool.query<{ count: string }>(
      "select count(*) from reporting_lender_performance where period_start = $1 and lender_id = $2",
      ["2024-02-01", "lender-a"]
    );
    expect(Number(lenderCount.rows[0].count)).toBe(1);
  });

  it("does not write to transactional tables during jobs", async () => {
    await seedReportingData();

    const countsBefore = await Promise.all([
      pool.query("select count(*) from applications"),
      pool.query("select count(*) from documents"),
      pool.query("select count(*) from document_versions"),
      pool.query("select count(*) from document_version_reviews"),
      pool.query("select count(*) from lender_submissions"),
    ]);

    await runDailyMetricsJob(new Date("2024-02-02T05:00:00.000Z"));
    await runPipelineSnapshotJob(new Date("2024-02-02T05:00:00.000Z"));
    await runLenderPerformanceJob(new Date("2024-02-02T05:00:00.000Z"));

    const countsAfter = await Promise.all([
      pool.query("select count(*) from applications"),
      pool.query("select count(*) from documents"),
      pool.query("select count(*) from document_versions"),
      pool.query("select count(*) from document_version_reviews"),
      pool.query("select count(*) from lender_submissions"),
    ]);

    countsBefore.forEach((before, index) => {
      expect(before.rows[0].count).toBe(countsAfter[index].rows[0].count);
    });
  });
});
