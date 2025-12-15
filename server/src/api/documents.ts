import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db";
import {
  applications,
  documentIntegrityEvents,
  documentVersions,
  documents,
} from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";
import { buildDocumentBlobKey, generateReadSas, generateUploadSas, headBlob } from "../services/blobService";
import { DocumentCompleteSchema, DocumentCreateSchema, DocumentValidateSchema } from "../documents/documents.validators";
import { OcrService } from "../ocr/ocr.service";
import { BankingService } from "../banking/banking.service";

const router = Router();

router.use(authenticate);

const ocrService = new OcrService();
const bankingService = new BankingService();

async function logIntegrityEvent(documentId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  await db.insert(documentIntegrityEvents).values({ documentId, eventType, metadata });
}

router.post("/presign", async (req, res, next) => {
  try {
    const parsed = DocumentCreateSchema.parse(req.body);
    const [application] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, parsed.applicationId))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    let documentId = parsed.documentId ?? randomUUID();
    let versionNumber = 1;
    const now = new Date();

    if (parsed.documentId) {
      const [existing] = await db.select().from(documents).where(eq(documents.id, parsed.documentId)).limit(1);
      if (!existing) {
        return res.status(404).json({ error: "Document not found" });
      }
      versionNumber = (existing.version ?? 1) + 1;
      await db
        .update(documents)
        .set({
          blobKey: buildDocumentBlobKey(parsed.applicationId, documentId, versionNumber, parsed.fileName),
          version: versionNumber,
          updatedAt: now,
        })
        .where(eq(documents.id, documentId));
    } else {
      const blobKey = buildDocumentBlobKey(parsed.applicationId, documentId, versionNumber, parsed.fileName);
      await db.insert(documents).values({
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

    const blobKey = buildDocumentBlobKey(parsed.applicationId, documentId, versionNumber, parsed.fileName);
    const uploadUrl = generateUploadSas(blobKey);
    await logIntegrityEvent(documentId, "upload_started", { version: versionNumber });

    res.status(201).json({ uploadUrl, documentId, blobKey, version: versionNumber });
  } catch (err) {
    next(err);
  }
});

router.post("/complete", async (req, res, next) => {
  try {
    const parsed = DocumentCompleteSchema.parse(req.body);
    const [document] = await db.select().from(documents).where(eq(documents.id, parsed.documentId)).limit(1);
    if (!document) return res.status(404).json({ error: "Document not found" });

    if (parsed.blobKey !== document.blobKey) {
      return res.status(400).json({ error: "Blob key does not match the expected upload target" });
    }

    const head = await headBlob(parsed.blobKey);
    if (!head.exists) {
      return res.status(404).json({ error: "Uploaded blob not found" });
    }

    const now = new Date();
    const metadata = {
      originalName: parsed.fileName,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.sizeBytes,
    };

    await db
      .update(documents)
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
      .where(eq(documents.id, parsed.documentId));

    await db
      .update(documentVersions)
      .set({ isCurrent: false })
      .where(eq(documentVersions.documentId, parsed.documentId));

    const [version] = await db
      .insert(documentVersions)
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

    const applicationId = document.applicationId as string | null;
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
  } catch (err) {
    next(err);
  }
});

router.get("/:id/view", async (req, res, next) => {
  try {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const url = generateReadSas(doc.blobKey);
    res.json({ documentId: doc.id, url, version: doc.version });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", async (req, res, next) => {
  try {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const url = generateReadSas(doc.blobKey, 15, undefined, doc.fileName);
    res.json({ documentId: doc.id, url, version: doc.version });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/reupload", async (req, res, next) => {
  try {
    const parsed = DocumentCreateSchema.parse({ ...req.body, documentId: req.params.id });
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const versionNumber = (doc.version ?? 1) + 1;
    const blobKey = buildDocumentBlobKey(parsed.applicationId, req.params.id, versionNumber, parsed.fileName);

    await db
      .update(documents)
      .set({
        fileName: parsed.fileName,
        mimeType: parsed.mimeType,
        blobKey,
        version: versionNumber,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, req.params.id));

    await logIntegrityEvent(req.params.id, "version_created", { version: versionNumber });
    const uploadUrl = generateUploadSas(blobKey);
    res.json({ uploadUrl, blobKey, version: versionNumber, documentId: req.params.id });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/validate", async (req, res, next) => {
  try {
    const parsed = DocumentValidateSchema.parse(req.body);
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const head = await headBlob(doc.blobKey);
    const now = new Date();

    if (!head.exists) {
      await db
        .update(documents)
        .set({ missingFlag: true, lastValidatedAt: now })
        .where(eq(documents.id, req.params.id));
      await logIntegrityEvent(req.params.id, "missing_detected", {});
      return res.status(404).json({ error: "Blob not found" });
    }

    const checksum = parsed.checksumSha256 ?? doc.checksumSha256;
    await db
      .update(documents)
      .set({ missingFlag: false, lastValidatedAt: now, checksumSha256: checksum })
      .where(eq(documents.id, req.params.id));
    await logIntegrityEvent(req.params.id, "checksum_verified", { checksum });

    res.json({ ok: true, metadata: head.metadata });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/version", async (req, res, next) => {
  try {
    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, req.params.id))
      .orderBy(desc(documentVersions.versionNumber));
    res.json({ documentId: req.params.id, versions });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/mark-missing", async (req, res, next) => {
  try {
    await db
      .update(documents)
      .set({ missingFlag: true, restoredFlag: false, lastValidatedAt: new Date() })
      .where(eq(documents.id, req.params.id));
    await logIntegrityEvent(req.params.id, "missing_detected", {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/mark-restored", async (req, res, next) => {
  try {
    await db
      .update(documents)
      .set({ missingFlag: false, restoredFlag: true, lastValidatedAt: new Date() })
      .where(eq(documents.id, req.params.id));
    await logIntegrityEvent(req.params.id, "restored", {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
