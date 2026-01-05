import request from "supertest";
import { buildApp, defaultConfig } from "../index";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";

const app = buildApp(defaultConfig);
const requestId = "test-request-id";

async function resetDb(): Promise<void> {
  await pool.query("delete from client_submissions");
  await pool.query("delete from lender_submission_retries");
  await pool.query("delete from lender_submissions");
  await pool.query("delete from document_version_reviews");
  await pool.query("delete from document_versions");
  await pool.query("delete from documents");
  await pool.query("delete from applications");
  await pool.query("delete from idempotency_keys");
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from password_resets");
  await pool.query("delete from audit_events");
  await pool.query("delete from users where id <> 'client-submission-system'");
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

    const login = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "user@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        name: "Test Application",
        metadata: { source: "web" },
        productType: "standard",
      });
    expect(appRes.status).toBe(201);

    const applicationId = appRes.body.application.id;

    const upload1 = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "Bank Statement",
        documentType: "bank_statement",
        metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 123 },
        content: "base64data",
      });
    expect(upload1.status).toBe(201);
    expect(upload1.body.document.version).toBe(1);

    const upload2 = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        documentId: upload1.body.document.documentId,
        title: "Bank Statement",
        documentType: "bank_statement",
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

    const ownerLogin = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "owner@apps.com",
      password: "Password123!",
    });
    const otherLogin = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "other@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${ownerLogin.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ name: "Owner Application", productType: "standard" });
    expect(appRes.status).toBe(201);

    const upload = await request(app)
      .post(`/api/applications/${appRes.body.application.id}/documents`)
      .set("Authorization", `Bearer ${otherLogin.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "Unauthorized",
        documentType: "bank_statement",
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

    const login = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "staff@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ name: "Pipeline Application", productType: "standard" });

    const transition = await request(app)
      .post(`/api/applications/${appRes.body.application.id}/pipeline`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ state: "LENDER_SUBMITTED" });

    expect(transition.status).toBe(400);
    expect(transition.body.code).toBe("invalid_transition");
  });

  it("allows override pipeline transitions", async () => {
    await createUserAccount({
      email: "override@apps.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "override@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ name: "Override Application", productType: "standard" });

    const applicationId = appRes.body.application.id;

    const bank = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "Bank Statement",
        documentType: "bank_statement",
        metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 123 },
        content: "base64data",
      });

    const idDoc = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "ID",
        documentType: "id_document",
        metadata: { fileName: "id.pdf", mimeType: "application/pdf", size: 50 },
        content: "iddata",
      });

    await request(app)
      .post(
        `/api/applications/${applicationId}/documents/${bank.body.document.documentId}/versions/${bank.body.document.versionId}/accept`
      )
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId);

    await request(app)
      .post(
        `/api/applications/${applicationId}/documents/${idDoc.body.document.documentId}/versions/${idDoc.body.document.versionId}/accept`
      )
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId);

    const transition = await request(app)
      .post(`/api/applications/${applicationId}/pipeline`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ state: "LENDER_SUBMITTED", override: true });

    expect(transition.status).toBe(200);

    const dbState = await pool.query(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );
    expect(dbState.rows[0].pipeline_state).toBe("LENDER_SUBMITTED");
  });

  it("forces requires docs when documents are missing", async () => {
    await createUserAccount({
      email: "requirements@apps.com",
      password: "Password123!",
      role: ROLES.USER,
    });

    const login = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "requirements@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ name: "Requirement App", productType: "standard" });
    expect(appRes.status).toBe(201);
    expect(appRes.body.application.pipelineState).toBe("REQUIRES_DOCS");
  });

  it("transitions to under review when required documents are accepted", async () => {
    await createUserAccount({
      email: "accept@apps.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "accept@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ name: "Acceptance App", productType: "standard" });

    const applicationId = appRes.body.application.id;

    const bank = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "Bank Statement",
        documentType: "bank_statement",
        metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 123 },
        content: "base64data",
      });

    const idDoc = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "ID",
        documentType: "id_document",
        metadata: { fileName: "id.pdf", mimeType: "application/pdf", size: 50 },
        content: "iddata",
      });

    await request(app)
      .post(
        `/api/applications/${applicationId}/documents/${bank.body.document.documentId}/versions/${bank.body.document.versionId}/accept`
      )
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId);

    await request(app)
      .post(
        `/api/applications/${applicationId}/documents/${idDoc.body.document.documentId}/versions/${idDoc.body.document.versionId}/accept`
      )
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId);

    const stateAfterAccept = await pool.query(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );
    expect(stateAfterAccept.rows[0].pipeline_state).toBe("UNDER_REVIEW");

    const audit = await pool.query(
      `select action
       from audit_events
       where action = 'document_accepted'
       order by created_at asc`
    );
    expect(audit.rows.length).toBe(2);
  });

  it("forces requires docs on document rejection", async () => {
    await createUserAccount({
      email: "review@apps.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "review@apps.com",
      password: "Password123!",
    });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ name: "Review App", productType: "standard" });

    const applicationId = appRes.body.application.id;

    const bank = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "Bank Statement",
        documentType: "bank_statement",
        metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 123 },
        content: "base64data",
      });
    expect(bank.status).toBe(201);

    const idDoc = await request(app)
      .post(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "ID",
        documentType: "id_document",
        metadata: { fileName: "id.pdf", mimeType: "application/pdf", size: 50 },
        content: "iddata",
      });
    expect(idDoc.status).toBe(201);

    const reject = await request(app)
      .post(
        `/api/applications/${applicationId}/documents/${bank.body.document.documentId}/versions/${bank.body.document.versionId}/reject`
      )
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId);
    expect(reject.status).toBe(200);

    const stateAfterReject = await pool.query(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );
    expect(stateAfterReject.rows[0].pipeline_state).toBe("REQUIRES_DOCS");
  });

  it("rejects documents with invalid mime types", async () => {
    await createUserAccount({
      email: "invalidmime@apps.com",
      password: "Password123!",
      role: ROLES.USER,
    });

    const login = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
        email: "invalidmime@apps.com",
        password: "Password123!",
      });

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ name: "Mime App", productType: "standard" });

    const upload = await request(app)
      .post(`/api/applications/${appRes.body.application.id}/documents`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        title: "Invalid",
        documentType: "bank_statement",
        metadata: { fileName: "bad.txt", mimeType: "text/plain", size: 12 },
        content: "data",
      });
    expect(upload.status).toBe(400);
    expect(upload.body.code).toBe("invalid_mime_type");

    const audit = await pool.query(
      `select action
       from audit_events
       where action = 'document_upload_rejected'`
    );
    expect(audit.rows.length).toBe(1);
  });
});
