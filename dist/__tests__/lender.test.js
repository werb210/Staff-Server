"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const db_1 = require("../db");
const auth_service_1 = require("../modules/auth/auth.service");
const roles_1 = require("../auth/roles");
const migrations_1 = require("../migrations");
const app = (0, index_1.buildApp)(index_1.defaultConfig);
const requestId = "test-request-id";
async function resetDb() {
    await db_1.pool.query("delete from client_submissions");
    await db_1.pool.query("delete from lender_submission_retries");
    await db_1.pool.query("delete from lender_submissions");
    await db_1.pool.query("delete from document_version_reviews");
    await db_1.pool.query("delete from document_versions");
    await db_1.pool.query("delete from documents");
    await db_1.pool.query("delete from applications");
    await db_1.pool.query("delete from idempotency_keys");
    await db_1.pool.query("delete from auth_refresh_tokens");
    await db_1.pool.query("delete from password_resets");
    await db_1.pool.query("delete from audit_events");
    await db_1.pool.query("delete from users where id <> 'client-submission-system'");
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
    await (0, migrations_1.runMigrations)();
});
beforeEach(async () => {
    await resetDb();
});
afterAll(async () => {
    await db_1.pool.end();
});
describe("lender submissions", () => {
    it("prevents duplicate submissions and persists status", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "lender@apps.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({
            email: "lender@apps.com",
            password: "Password123!",
        });
        const appRes = await (0, supertest_1.default)(app)
            .post("/api/applications")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ name: "Lender Application", productType: "standard" });
        const applicationId = appRes.body.application.id;
        const bank = await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({
            title: "Bank Statement",
            documentType: "bank_statement",
            metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 123 },
            content: "base64data",
        });
        const idDoc = await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({
            title: "ID",
            documentType: "id_document",
            metadata: { fileName: "id.pdf", mimeType: "application/pdf", size: 50 },
            content: "iddata",
        });
        await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents/${bank.body.document.documentId}/versions/${bank.body.document.versionId}/accept`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents/${idDoc.body.document.documentId}/versions/${idDoc.body.document.versionId}/accept`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        const submission1 = await (0, supertest_1.default)(app)
            .post("/api/lender/submissions")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ applicationId, idempotencyKey: "key-123" });
        expect(submission1.status).toBe(201);
        const submission2 = await (0, supertest_1.default)(app)
            .post("/api/lender/submissions")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ applicationId, idempotencyKey: "key-123" });
        expect(submission2.status).toBe(200);
        expect(submission2.body.submission.id).toBe(submission1.body.submission.id);
        const status = await (0, supertest_1.default)(app)
            .get(`/api/lender/submissions/${submission1.body.submission.id}`)
            .set("Authorization", `Bearer ${login.body.accessToken}`);
        expect(status.status).toBe(200);
        expect(status.body.submission.status).toBe("submitted");
        const audit = await db_1.pool.query(`select action
       from audit_events
       where action in ('lender_submission_created', 'lender_submission_retried')
       order by created_at asc`);
        expect(audit.rows.map((row) => row.action)).toEqual([
            "lender_submission_created",
            "lender_submission_retried",
        ]);
    });
    it("rejects submissions without required documents", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "lender2@apps.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({
            email: "lender2@apps.com",
            password: "Password123!",
        });
        const appRes = await (0, supertest_1.default)(app)
            .post("/api/applications")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ name: "Blocked Application", productType: "standard" });
        const submission = await (0, supertest_1.default)(app)
            .post("/api/lender/submissions")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ applicationId: appRes.body.application.id });
        expect(submission.status).toBe(400);
        expect(submission.body.submission.status).toBe("failed");
        expect(submission.body.submission.failureReason).toBe("missing_documents");
    });
    it("retries failed lender submissions", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "retry@apps.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const login = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({
            email: "retry@apps.com",
            password: "Password123!",
        });
        const appRes = await (0, supertest_1.default)(app)
            .post("/api/applications")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ name: "Retry Application", productType: "standard" });
        const applicationId = appRes.body.application.id;
        const bank = await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({
            title: "Bank Statement",
            documentType: "bank_statement",
            metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 123 },
            content: "base64data",
        });
        const idDoc = await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({
            title: "ID",
            documentType: "id_document",
            metadata: { fileName: "id.pdf", mimeType: "application/pdf", size: 50 },
            content: "iddata",
        });
        await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents/${bank.body.document.documentId}/versions/${bank.body.document.versionId}/accept`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        await (0, supertest_1.default)(app)
            .post(`/api/applications/${applicationId}/documents/${idDoc.body.document.documentId}/versions/${idDoc.body.document.versionId}/accept`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        const submission = await (0, supertest_1.default)(app)
            .post("/api/lender/submissions")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ applicationId, lenderId: "timeout" });
        expect(submission.status).toBe(502);
        expect(submission.body.submission.failureReason).toBe("lender_timeout");
        const retry = await (0, supertest_1.default)(app)
            .post(`/api/admin/transmissions/${submission.body.submission.id}/retry`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        expect(retry.status).toBe(200);
        expect(retry.body.retry.status).toBe("submitted");
    });
});
