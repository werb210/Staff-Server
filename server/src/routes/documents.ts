import { Router, type Response } from "express";
import { z } from "zod";
import {
  DocumentSaveSchema,
  DocumentStatusUpdateSchema,
} from "../schemas/document.schema.js";
import {
  DocumentNotFoundError,
  DocumentVersionNotFoundError,
} from "../services/documentService.js";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();
const DocumentIdSchema = z.object({ id: z.string().uuid() });

const parseDocumentId = (params: unknown) => DocumentIdSchema.safeParse(params);

const handleDocumentError = (error: unknown, res: Response) => {
  if (error instanceof DocumentNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (error instanceof DocumentVersionNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  throw error;
};

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

router.get("/:id/status", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = parseDocumentId(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  try {
    const status = req.silo!.services.documents.getStatus(params.data.id);
    return res.json({ message: "OK", data: status });
  } catch (error) {
    return handleDocumentError(error, res);
  }
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
  try {
    const result = req.silo!.services.documents.updateStatus(
      parsed.data.id,
      parsed.data.status,
      parsed.data.reviewedBy,
    );
    return res.json({ message: "OK", data: result });
  } catch (error) {
    return handleDocumentError(error, res);
  }
});

router.get("/:id/versions", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = parseDocumentId(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  try {
    const versions = req.silo!.services.documents.listVersions(params.data.id);
    return res.json({ message: "OK", data: versions });
  } catch (error) {
    return handleDocumentError(error, res);
  }
});

router.get("/:id/download", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = parseDocumentId(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  const version = z
    .object({
      version: z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => Number.parseInt(value, 10))
        .optional(),
    })
    .safeParse(req.query);
  if (!version.success) {
    return res.status(400).json({ message: "Invalid version" });
  }
  try {
    const download = req.silo!.services.documents.getDownloadUrl(
      params.data.id,
      version.data.version,
    );
    return res.json({ message: "OK", data: download });
  } catch (error) {
    return handleDocumentError(error, res);
  }
});

router.post("/:id/upload-url", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = parseDocumentId(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  const payload = z
    .object({
      fileName: z
        .string()
        .min(1)
        .transform((value) => value.trim())
        .refine((value) => value.length > 0, "File name cannot be empty"),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid upload payload" });
  }
  try {
    const upload = req.silo!.services.documents.createUploadUrl(
      params.data.id,
      payload.data.fileName,
    );
    return res.json({ message: "OK", data: upload });
  } catch (error) {
    return handleDocumentError(error, res);
  }
});

export default router;
