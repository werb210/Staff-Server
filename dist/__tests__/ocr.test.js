"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const migrations_1 = require("../migrations");
const db_1 = require("../db");
const auth_service_1 = require("../modules/auth/auth.service");
const roles_1 = require("../auth/roles");
const applications_repo_1 = require("../modules/applications/applications.repo");
const ocr_repo_1 = require("../modules/ocr/ocr.repo");
const ocr_service_1 = require("../modules/ocr/ocr.service");
async function seedDocument() {
    const user = await (0, auth_service_1.createUserAccount)({
        email: `ocr-${(0, crypto_1.randomUUID)()}@example.com`,
        password: "Password123!",
        role: roles_1.ROLES.USER,
    });
    const application = await (0, applications_repo_1.createApplication)({
        ownerUserId: user.id,
        name: "OCR App",
        metadata: null,
        productType: "standard",
    });
    const document = await (0, applications_repo_1.createDocument)({
        applicationId: application.id,
        ownerUserId: user.id,
        title: "Bank Statement",
        documentType: "bank_statement",
    });
    await (0, applications_repo_1.createDocumentVersion)({
        documentId: document.id,
        version: 1,
        metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 100 },
        content: Buffer.from("pdf-data").toString("base64"),
    });
    return { documentId: document.id, applicationId: application.id };
}
describe("ocr jobs", () => {
    beforeAll(async () => {
        await (0, migrations_1.runMigrations)();
    });
    beforeEach(async () => {
        await db_1.pool.query("delete from ocr_results");
        await db_1.pool.query("delete from ocr_jobs");
        await db_1.pool.query("delete from document_version_reviews");
        await db_1.pool.query("delete from document_versions");
        await db_1.pool.query("delete from documents");
        await db_1.pool.query("delete from applications");
        await db_1.pool.query("delete from users");
    });
    it("creates OCR jobs idempotently", async () => {
        const { documentId, applicationId } = await seedDocument();
        const first = await (0, ocr_repo_1.createOcrJob)({
            documentId,
            applicationId,
            maxAttempts: 3,
        });
        const second = await (0, ocr_repo_1.createOcrJob)({
            documentId,
            applicationId,
            maxAttempts: 3,
        });
        expect(first.id).toEqual(second.id);
        const count = await db_1.pool.query("select count(*) from ocr_jobs where document_id = $1", [documentId]);
        expect(Number(count.rows[0].count)).toBe(1);
    });
    it("locks OCR jobs safely", async () => {
        const { documentId, applicationId } = await seedDocument();
        await (0, ocr_repo_1.createOcrJob)({
            documentId,
            applicationId,
            maxAttempts: 2,
        });
        const [locked] = await (0, ocr_repo_1.lockOcrJobs)({ limit: 1, lockedBy: "worker-1" });
        expect(locked).toBeDefined();
        expect(locked.status).toBe("processing");
        const secondLock = await (0, ocr_repo_1.lockOcrJobs)({ limit: 1, lockedBy: "worker-2" });
        expect(secondLock).toHaveLength(0);
    });
    it("reclaims OCR jobs with expired locks", async () => {
        const { documentId, applicationId } = await seedDocument();
        const job = await (0, ocr_repo_1.createOcrJob)({
            documentId,
            applicationId,
            maxAttempts: 2,
        });
        const [locked] = await (0, ocr_repo_1.lockOcrJobs)({ limit: 1, lockedBy: "worker-1" });
        expect(locked?.id).toBe(job.id);
        const expired = new Date(Date.now() - 20 * 60 * 1000);
        await db_1.pool.query(`update ocr_jobs
       set locked_at = $2
       where id = $1`, [job.id, expired]);
        const reclaimed = await (0, ocr_repo_1.lockOcrJobs)({ limit: 1, lockedBy: "worker-2" });
        expect(reclaimed).toHaveLength(1);
        expect(reclaimed[0].id).toBe(job.id);
        expect(reclaimed[0].locked_by).toBe("worker-2");
    });
    it("bounds retries with exponential backoff", async () => {
        const { documentId, applicationId } = await seedDocument();
        const job = await (0, ocr_repo_1.createOcrJob)({
            documentId,
            applicationId,
            maxAttempts: 2,
        });
        const mockProvider = {
            extract: jest.fn().mockRejectedValue(new Error("provider_failed")),
        };
        const mockStorage = {
            getBuffer: jest.fn().mockResolvedValue(Buffer.from("data")),
        };
        await (0, ocr_service_1.processOcrJob)(job, { provider: mockProvider, storage: mockStorage });
        const firstFailure = await (0, ocr_repo_1.findOcrJobByDocumentId)(documentId);
        expect(firstFailure?.status).toBe("failed");
        expect(firstFailure?.attempt_count).toBe(1);
        await (0, ocr_service_1.processOcrJob)(firstFailure, { provider: mockProvider, storage: mockStorage });
        const secondFailure = await (0, ocr_repo_1.findOcrJobByDocumentId)(documentId);
        expect(secondFailure?.status).toBe("canceled");
        expect(secondFailure?.attempt_count).toBe(2);
    });
});
