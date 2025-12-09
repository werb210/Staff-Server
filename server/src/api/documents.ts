import { Router } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { applications, documentVersions, documents } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";
import { buildBlobPath, uploadBuffer, generatePresignedUrl, softDeleteFile } from "../services/blobService";
import { calculateChecksum } from "../services/documentIntegrity";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticate);

router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "file is required" });
    }
    if (!req.body.applicationId) {
      return res.status(400).json({ error: "applicationId is required" });
    }
    const [application] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, req.body.applicationId))
      .limit(1);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    const checksum = calculateChecksum(file.buffer);
    const blobPath = buildBlobPath(file.originalname);
    await uploadBuffer(blobPath, file.buffer, file.mimetype);

    let versionNumber = 1;
    let documentId = req.body.documentId as string | undefined;
    if (documentId) {
      const [existing] = await db.select().from(documents).where(eq(documents.id, documentId));
      if (!existing) {
        return res.status(404).json({ error: "Document not found" });
      }
      versionNumber = (existing.version ?? 1) + 1;
      await db
        .update(documents)
        .set({
          storagePath: blobPath,
          checksum,
          version: versionNumber,
          sizeBytes: file.size,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
      await db
        .update(documentVersions)
        .set({ isCurrent: false })
        .where(eq(documentVersions.documentId, documentId));
    } else {
      const [created] = await db
        .insert(documents)
        .values({
          applicationId: application.id,
          companyId: req.body.companyId,
          contactId: req.body.contactId,
          fileName: file.originalname,
          mimeType: file.mimetype,
          storagePath: blobPath,
          checksum,
          version: 1,
          sizeBytes: file.size,
          uploadedByUserId: req.user?.id,
        })
        .returning({ id: documents.id });
      documentId = created.id;
    }

    await db.insert(documentVersions).values({
      documentId: documentId!,
      versionNumber,
      storagePath: blobPath,
      checksum,
      sizeBytes: file.size,
      uploadedByUserId: req.user?.id,
      isCurrent: true,
    });

    res.status(201).json({ documentId, version: versionNumber });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const url = generatePresignedUrl(doc.storagePath);
    res.json({ ...doc, url });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    await softDeleteFile(doc.storagePath);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
