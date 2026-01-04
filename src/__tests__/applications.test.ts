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

describe("applications and documents", () => {
  it("creates applications and versions documents", async () => {
    await createUserAccount({
      email: "user@apps.com",
      password: "Password123!",
      role: ROLES.USER,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "user@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ name: "Test Application", metadata: { source: "web" } });
    expect(appRes.status).toBe(201);

    const applicationId = appRes.body.application.id;

    const upload1 = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({
        title: "Bank Statement",
        metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 123 },
        content: "base64data",
      });
    expect(upload1.status).toBe(201);
    expect(upload1.body.document.version).toBe(1);

    const upload2 = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({
        documentId: upload1.body.document.documentId,
        title: "Bank Statement",
        metadata: { fileName: "bank-v2.pdf", mimeType: "application/pdf", size: 456 },
        content: "base64data2",
      });
    expect(upload2.status).toBe(201);
    expect(upload2.body.document.version).toBe(2);
  });

  it("enforces application ownership for document uploads", async () => {
    await createUserAccount({
      email: "owner@apps.com",
      password: "Password123!",
      role: ROLES.USER,
    });
    await createUserAccount({
      email: "other@apps.com",
      password: "Password123!",
      role: ROLES.USER,
    });

    const ownerLogin = await request(app).post("/api/auth/login").send({
      email: "owner@apps.com",
      password: "Password123!",
    });
    const otherLogin = await request(app).post("/api/auth/login").send({
      email: "other@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${ownerLogin.body.accessToken}`)
      .send({ name: "Owner Application" });
    expect(appRes.status).toBe(201);

    const upload = await request(app)
      .post(`/api/applications/${appRes.body.application.id}/documents`)
      .set("Authorization", `Bearer ${otherLogin.body.accessToken}`)
      .send({
        title: "Unauthorized",
        metadata: { fileName: "oops.pdf", mimeType: "application/pdf", size: 12 },
        content: "data",
      });
    expect(upload.status).toBe(403);
    expect(upload.body.code).toBe("forbidden");
  });

  it("rejects invalid pipeline transitions without override", async () => {
    await createUserAccount({
      email: "staff@apps.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "staff@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ name: "Pipeline Application" });

    const transition = await request(app)
      .post(`/api/applications/${appRes.body.application.id}/pipeline`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ state: "submitted" });

    expect(transition.status).toBe(400);
    expect(transition.body.code).toBe("invalid_transition");
  });

  it("allows override pipeline transitions", async () => {
    await createUserAccount({
      email: "override@apps.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "override@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ name: "Override Application" });

    const transition = await request(app)
      .post(`/api/applications/${appRes.body.application.id}/pipeline`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ state: "submitted", override: true });

    expect(transition.status).toBe(200);

    const dbState = await pool.query(
      "select pipeline_state from applications where id = $1",
      [appRes.body.application.id]
    );
    expect(dbState.rows[0].pipeline_state).toBe("submitted");
  });
});
