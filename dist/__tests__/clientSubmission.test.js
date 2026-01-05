"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const db_1 = require("../db");
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
describe("client submissions", () => {
    it("accepts a full client submission", async () => {
        const payload = {
            submissionKey: "submission-123",
            productType: "standard",
            business: {
                legalName: "Acme LLC",
                taxId: "12-3456789",
                entityType: "llc",
                address: {
                    line1: "100 Market St",
                    city: "San Francisco",
                    state: "CA",
                    postalCode: "94105",
                    country: "US",
                },
            },
            applicant: {
                firstName: "Ava",
                lastName: "Applicant",
                email: "ava@applicant.test",
                phone: "+1-555-555-0101",
            },
            documents: [
                {
                    title: "Bank Statement",
                    documentType: "bank_statement",
                    metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 1234 },
                    content: "base64data",
                },
                {
                    title: "ID",
                    documentType: "id_document",
                    metadata: { fileName: "id.pdf", mimeType: "application/pdf", size: 456 },
                    content: "base64data2",
                },
            ],
        };
        const res = await (0, supertest_1.default)(app)
            .post("/api/client/submissions")
            .set("x-request-id", requestId)
            .send(payload);
        expect(res.status).toBe(201);
        expect(res.body.submission.applicationId).toBeDefined();
        expect(res.body.submission.pipelineState).toBe("NEW");
        const appRes = await db_1.pool.query("select pipeline_state from applications where id = $1", [res.body.submission.applicationId]);
        expect(appRes.rows[0].pipeline_state).toBe("NEW");
        const docRes = await db_1.pool.query("select count(*)::int as count from documents where application_id = $1", [res.body.submission.applicationId]);
        expect(docRes.rows[0].count).toBe(2);
    });
    it("rejects invalid submissions", async () => {
        const payload = {
            submissionKey: "submission-456",
            productType: "standard",
            business: {
                legalName: "Acme LLC",
                taxId: "12-3456789",
                entityType: "llc",
                address: {
                    line1: "100 Market St",
                    city: "San Francisco",
                    state: "CA",
                    postalCode: "94105",
                    country: "US",
                },
            },
            applicant: {
                firstName: "Ava",
                lastName: "Applicant",
                email: "ava@applicant.test",
                phone: "+1-555-555-0101",
            },
            documents: [
                {
                    title: "Bank Statement",
                    documentType: "bank_statement",
                    metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 1234 },
                    content: "base64data",
                },
            ],
        };
        const res = await (0, supertest_1.default)(app)
            .post("/api/client/submissions")
            .set("x-request-id", requestId)
            .send(payload);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("missing_documents");
    });
});
