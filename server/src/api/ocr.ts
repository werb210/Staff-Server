import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { documents } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";
import { getFile } from "../services/blobService";
import { verifyDocumentIntegrity } from "../services/documentIntegrity";
import { OCREngine } from "../ocrEngine";

const router = Router();
router.use(authenticate);
const ocrEngine = new OCREngine();

router.get("/:id", async (req, res, next) => {
  try {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/verify", async (req, res, next) => {
  try {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id)).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const buffer = await getFile(doc.blobKey);
    const integrity = verifyDocumentIntegrity(buffer, doc.checksumSha256);
    res.json({ documentId: doc.id, integrity });
  } catch (err) {
    next(err);
  }
});

router.post("/process-document", async (req, res, next) => {
  try {
    const result = await ocrEngine.processDocument({
      applicationId: req.body.applicationId,
      documentVersionId: req.body.documentVersionId,
      blobKey: req.body.blobKey,
      userId: req.user?.id,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
