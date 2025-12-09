import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { documents } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";
import { getFile } from "../services/blobService";
import { verifyDocumentIntegrity } from "../services/documentIntegrity";

const router = Router();
router.use(authenticate);

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
    const buffer = await getFile(doc.storagePath);
    const integrity = verifyDocumentIntegrity(buffer, doc.checksum);
    res.json({ documentId: doc.id, integrity });
  } catch (err) {
    next(err);
  }
});

export default router;
