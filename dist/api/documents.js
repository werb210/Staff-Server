"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const requireAuth_1 = require("../middleware/requireAuth");
const blobService_1 = require("../services/blobService");
const documents_validators_1 = require("../documents/documents.validators");
const ocr_service_1 = require("../ocr/ocr.service");
const banking_service_1 = require("../banking/banking.service");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
const ocrService = new ocr_service_1.OcrService();
const bankingService = new banking_service_1.BankingService();
async function logIntegrityEvent(documentId, eventType, metadata = {}) {
    await db_1.db.insert(schema_1.documentIntegrityEvents).values({ documentId, eventType, metadata });
}
router.post("/presign", async (req, res, next) => {
    try {
        const parsed = documents_validators_1.DocumentCreateSchema.parse(req.body);
        const [application] = await db_1.db
            .select({ id: schema_1.applications.id })
            .from(schema_1.applications)
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, parsed.applicationId))
            .limit(1);
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }
        let documentId = parsed.documentId ?? (0, crypto_1.randomUUID)();
        let versionNumber = 1;
        const now = new Date();
        if (parsed.documentId) {
            const [existing] = await db_1.db.select().from(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.id, parsed.documentId)).limit(1);
            if (!existing) {
                return res.status(404).json({ error: "Document not found" });
            }
            versionNumber = (existing.version ?? 1) + 1;
            await db_1.db
                .update(schema_1.documents)
                .set({
                blobKey: (0, blobService_1.buildDocumentBlobKey)(parsed.applicationId, documentId, versionNumber, parsed.fileName),
                version: versionNumber,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.documents.id, documentId));
        }
        else {
            const blobKey = (0, blobService_1.buildDocumentBlobKey)(parsed.applicationId, documentId, versionNumber, parsed.fileName);
            await db_1.db.insert(schema_1.documents).values({
                id: documentId,
                applicationId: parsed.applicationId,
                companyId: parsed.companyId,
                contactId: parsed.contactId,
                fileName: parsed.fileName,
                mimeType: parsed.mimeType,
                blobKey,
                checksumSha256: "pending",
                version: versionNumber,
                sizeBytes: 0,
                uploadedByUserId: req.user?.id,
                uploadedBy: req.user?.id,
                azureMetadata: { originalName: parsed.fileName, mimeType: parsed.mimeType },
            });
        }
        const blobKey = (0, blobService_1.buildDocumentBlobKey)(parsed.applicationId, documentId, versionNumber, parsed.fileName);
        const uploadUrl = (0, blobService_1.generateUploadSas)(blobKey);
        await logIntegrityEvent(documentId, "upload_started", { version: versionNumber });
        res.status(201).json({ uploadUrl, documentId, blobKey, version: versionNumber });
    }
    catch (err) {
        next(err);
    }
});
router.post("/complete", async (req, res, next) => {
    try {
        const parsed = documents_validators_1.DocumentCompleteSchema.parse(req.body);
        const [document] = await db_1.db.select().from(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.id, parsed.documentId)).limit(1);
        if (!document)
            return res.status(404).json({ error: "Document not found" });
        if (parsed.blobKey !== document.blobKey) {
            return res.status(400).json({ error: "Blob key does not match the expected upload target" });
        }
        const head = await (0, blobService_1.headBlob)(parsed.blobKey);
        if (!head.exists) {
            return res.status(404).json({ error: "Uploaded blob not found" });
        }
        const now = new Date();
        const metadata = {
            originalName: parsed.fileName,
            mimeType: parsed.mimeType,
            sizeBytes: parsed.sizeBytes,
        };
        await db_1.db
            .update(schema_1.documents)
            .set({
            checksumSha256: parsed.checksumSha256,
            sizeBytes: parsed.sizeBytes,
            fileName: parsed.fileName,
            mimeType: parsed.mimeType,
            version: document.version,
            uploadedByUserId: req.user?.id ?? document.uploadedByUserId,
            uploadedBy: req.user?.id ?? document.uploadedBy,
            lastValidatedAt: now,
            missingFlag: false,
            restoredFlag: false,
            azureMetadata: metadata,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.documents.id, parsed.documentId));
        await db_1.db
            .update(schema_1.documentVersions)
            .set({ isCurrent: false })
            .where((0, drizzle_orm_1.eq)(schema_1.documentVersions.documentId, parsed.documentId));
        const [version] = await db_1.db
            .insert(schema_1.documentVersions)
            .values({
            documentId: parsed.documentId,
            versionNumber: document.version,
            blobKey: parsed.blobKey,
            checksumSha256: parsed.checksumSha256,
            sizeBytes: parsed.sizeBytes,
            azureMetadata: metadata,
            uploadedByUserId: req.user?.id,
            isCurrent: true,
        })
            .returning();
        await logIntegrityEvent(parsed.documentId, "upload_completed", { version: document.version });
        await logIntegrityEvent(parsed.documentId, "checksum_verified", { checksum: parsed.checksumSha256 });
        const applicationId = document.applicationId;
        if (!applicationId) {
            return res.status(400).json({ error: "Document is not linked to an application" });
        }
        // Automatic OCR + banking triggers
        await ocrService.process({
            applicationId,
            documentId: parsed.documentId,
            documentVersionId: version.id,
            blobKey: parsed.blobKey,
            userId: req.user?.id,
        });
        const looksLikeBankStatement = /bank|statement/i.test(parsed.fileName);
        if (looksLikeBankStatement) {
            await bankingService.analyze({
                applicationId,
                documentVersionIds: [version.id],
                userId: req.user?.id,
            });
        }
        res.json({ ok: true, version: document.version });
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id/view", async (req, res, next) => {
    try {
        const [doc] = await db_1.db.select().from(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id)).limit(1);
        if (!doc)
            return res.status(404).json({ error: "Document not found" });
        const url = (0, blobService_1.generateReadSas)(doc.blobKey);
        res.json({ documentId: doc.id, url, version: doc.version });
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id/download", async (req, res, next) => {
    try {
        const [doc] = await db_1.db.select().from(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id)).limit(1);
        if (!doc)
            return res.status(404).json({ error: "Document not found" });
        const url = (0, blobService_1.generateReadSas)(doc.blobKey, 15, undefined, doc.fileName);
        res.json({ documentId: doc.id, url, version: doc.version });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/reupload", async (req, res, next) => {
    try {
        const parsed = documents_validators_1.DocumentCreateSchema.parse({ ...req.body, documentId: req.params.id });
        const [doc] = await db_1.db.select().from(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id)).limit(1);
        if (!doc)
            return res.status(404).json({ error: "Document not found" });
        const versionNumber = (doc.version ?? 1) + 1;
        const blobKey = (0, blobService_1.buildDocumentBlobKey)(parsed.applicationId, req.params.id, versionNumber, parsed.fileName);
        await db_1.db
            .update(schema_1.documents)
            .set({
            fileName: parsed.fileName,
            mimeType: parsed.mimeType,
            blobKey,
            version: versionNumber,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id));
        await logIntegrityEvent(req.params.id, "version_created", { version: versionNumber });
        const uploadUrl = (0, blobService_1.generateUploadSas)(blobKey);
        res.json({ uploadUrl, blobKey, version: versionNumber, documentId: req.params.id });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/validate", async (req, res, next) => {
    try {
        const parsed = documents_validators_1.DocumentValidateSchema.parse(req.body);
        const [doc] = await db_1.db.select().from(schema_1.documents).where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id)).limit(1);
        if (!doc)
            return res.status(404).json({ error: "Document not found" });
        const head = await (0, blobService_1.headBlob)(doc.blobKey);
        const now = new Date();
        if (!head.exists) {
            await db_1.db
                .update(schema_1.documents)
                .set({ missingFlag: true, lastValidatedAt: now })
                .where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id));
            await logIntegrityEvent(req.params.id, "missing_detected", {});
            return res.status(404).json({ error: "Blob not found" });
        }
        const checksum = parsed.checksumSha256 ?? doc.checksumSha256;
        await db_1.db
            .update(schema_1.documents)
            .set({ missingFlag: false, lastValidatedAt: now, checksumSha256: checksum })
            .where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id));
        await logIntegrityEvent(req.params.id, "checksum_verified", { checksum });
        res.json({ ok: true, metadata: head.metadata });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/version", async (req, res, next) => {
    try {
        const versions = await db_1.db
            .select()
            .from(schema_1.documentVersions)
            .where((0, drizzle_orm_1.eq)(schema_1.documentVersions.documentId, req.params.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.documentVersions.versionNumber));
        res.json({ documentId: req.params.id, versions });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/mark-missing", async (req, res, next) => {
    try {
        await db_1.db
            .update(schema_1.documents)
            .set({ missingFlag: true, restoredFlag: false, lastValidatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id));
        await logIntegrityEvent(req.params.id, "missing_detected", {});
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/mark-restored", async (req, res, next) => {
    try {
        await db_1.db
            .update(schema_1.documents)
            .set({ missingFlag: false, restoredFlag: true, lastValidatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.documents.id, req.params.id));
        await logIntegrityEvent(req.params.id, "restored", {});
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
