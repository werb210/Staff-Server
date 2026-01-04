import request from "supertest";
import { buildApp } from "../index";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";

const app = buildApp();

async function resetDb(): Promise<void> {
  await pool.query("delete from lender_submissions");
  await pool.query("delete from document_versions");
  await pool.query("delete from documents");
  await pool.query("delete from applications");
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

describe("lender submissions", () => {
  it("prevents duplicate submissions and persists status", async () => {
    await createUserAccount({
      email: "lender@apps.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "lender@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ name: "Lender Application" });

    const applicationId = appRes.body.application.id;

    const submission1 = await request(app)
      .post("/api/lender/submissions")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ applicationId, idempotencyKey: "key-123" });
    expect(submission1.status).toBe(201);

    const submission2 = await request(app)
      .post("/api/lender/submissions")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ applicationId, idempotencyKey: "key-123" });
    expect(submission2.status).toBe(201);
    expect(submission2.body.submission.id).toBe(submission1.body.submission.id);

    const status = await request(app)
      .get(`/api/lender/submissions/${submission1.body.submission.id}`)
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(status.status).toBe(200);
    expect(status.body.submission.status).toBe("submitted");

    const audit = await pool.query(
      `select action
       from audit_events
       where action in ('lender_submission_created', 'lender_submission_retried')
       order by created_at asc`
    );
    expect(audit.rows.map((row) => row.action)).toEqual([
      "lender_submission_created",
      "lender_submission_retried",
    ]);
  });
});
