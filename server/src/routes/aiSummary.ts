import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();

router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }

  const payload = z
    .object({
      documentId: z.string().uuid().optional(),
      fileName: z.string().min(1).optional(),
      ocrText: z.string().optional(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid summary payload" });
  }

  if (payload.data.documentId) {
    const document = req.silo!.services.documents.getDocument(payload.data.documentId);
    const summary = req.silo!.services.ai.summarizeDocument({
      fileName: document.fileName,
      ocrTextPreview: document.ocrTextPreview,
    });
    return res.json({ message: "OK", data: { summary } });
  }

  if (payload.data.fileName && payload.data.ocrText) {
    const summary = req.silo!.services.ai.summarizeDocument({
      fileName: payload.data.fileName,
      ocrTextPreview: payload.data.ocrText,
    });
    return res.json({ message: "OK", data: { summary } });
  }

  return res.status(400).json({ message: "Provide either documentId or fileName with ocrText" });
});

export default router;
