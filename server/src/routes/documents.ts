import { Router } from "express";
import { z } from "zod";
import {
  DocumentSaveSchema,
  DocumentStatusUpdateSchema,
} from "../schemas/document.schema.js";
import { azureBlobStorage } from "../utils/azureBlobStorage.js";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const { applicationId } = req.query;
  const documents = req.silo!.services.documents.listDocuments(
    typeof applicationId === "string" ? applicationId : undefined,
  );
  res.json({ message: "OK", data: documents });
});

router.get("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  const document = req.silo!.services.documents.getDocument(id.data);
  res.json({ message: "OK", data: document });
});

router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = DocumentSaveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid document payload" });
  }
  const defaults = {
    status: parsed.data.status ?? req.silo!.services.metadata.documentStatusDefault,
  };
  const saved = req.silo!.services.documents.saveDocument({
    ...parsed.data,
    status: defaults.status,
  });
  res.status(201).json({ message: "OK", data: saved });
});

router.post("/:id/status", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = DocumentStatusUpdateSchema.safeParse({
    id: req.params.id,
    status: req.body.status,
    reviewedBy: req.body.reviewedBy,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid document status update" });
  }
  const result = req.silo!.services.documents.updateStatus(
    parsed.data.id,
    parsed.data.status,
  );
  res.json({ message: "OK", data: result });
});

router.post("/upload-url", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      fileName: z.string().min(1),
      applicationId: z.string().uuid(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid upload payload" });
  }
  const blobName = `${payload.data.applicationId}/${Date.now()}-${payload.data.fileName}`;
  const upload = azureBlobStorage.createUploadUrl("documents", blobName);
  res.json({ message: "OK", data: upload });
});

export default router;
