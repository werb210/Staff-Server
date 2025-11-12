import { Router, type NextFunction, type Response } from "express";
import JSZip from "jszip";
import multer from "multer";
import { z } from "zod";
import {
  DocumentUploadSchema,
  DocumentSaveSchema,
  DocumentStatusUpdateSchema,
} from "../schemas/document.schema.js";
import {
  DocumentNotFoundError,
  DocumentVersionNotFoundError,
} from "../services/documentService.js";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const DocumentIdSchema = z.object({ id: z.string().uuid() });
const UploadMetadataSchema = DocumentUploadSchema.pick({
  applicationId: true,
  documentId: true,
  uploadedBy: true,
  note: true,
});
const VersionQuerySchema = z
  .object({
    version: z
      .union([z.string(), z.number(), z.array(z.string())])
      .transform((value) => {
        const candidate = Array.isArray(value) ? value[0] : value;
        const parsed = Number.parseInt(candidate.toString(), 10);
        if (Number.isNaN(parsed)) {
          throw new Error("Invalid version");
        }
        return parsed;
      })
      .optional(),
  })
  .passthrough();

const parseDocumentId = (params: unknown) => DocumentIdSchema.safeParse(params);

const handleDocumentError = (
  error: unknown,
  res: Response,
  next?: NextFunction,
) => {
  if (error instanceof DocumentNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (error instanceof DocumentVersionNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (next) {
    return next(error);
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

router.post(
  "/upload",
  upload.single("file"),
  async (req, res, next) => {
    if (isPlaceholderSilo(req)) {
      return respondWithPlaceholder(res);
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }
    const parsed = UploadMetadataSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid upload metadata" });
    }
    try {
      const saved = await req.silo!.services.documents.uploadDocument({
        applicationId: parsed.data.applicationId,
        documentId: parsed.data.documentId,
        fileName: file.originalname ?? "upload.bin",
        contentType: file.mimetype || "application/octet-stream",
        data: file.buffer,
        uploadedBy: parsed.data.uploadedBy,
        note: parsed.data.note,
        status: req.silo!.services.metadata.documentStatusDefault,
      });
      return res.status(201).json({ message: "OK", data: saved });
    } catch (error) {
      return handleDocumentError(error, res, next);
    }
  },
);

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

router.get("/:id/preview", async (req, res, next) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = parseDocumentId(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  const version = VersionQuerySchema.safeParse(req.query);
  if (!version.success) {
    return res.status(400).json({ message: "Invalid version" });
  }
  try {
    const versionInfo = req.silo!.services.documents.getVersionInfo(
      params.data.id,
      version.data.version,
    );
    res.setHeader("Content-Type", versionInfo.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${versionInfo.fileName}"`,
    );
    await req.silo!.services.documents.streamVersion(versionInfo, res);
  } catch (error) {
    return handleDocumentError(error, res, next);
  }
});

router.get("/:id/download", async (req, res, next) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = parseDocumentId(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  const version = VersionQuerySchema.safeParse(req.query);
  if (!version.success) {
    return res.status(400).json({ message: "Invalid version" });
  }
  try {
    const { buffer, version: versionInfo } =
      await req.silo!.services.documents.downloadDocument(
        params.data.id,
        version.data.version,
      );
    res.setHeader("Content-Type", versionInfo.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${versionInfo.fileName}"`,
    );
    return res.send(buffer);
  } catch (error) {
    return handleDocumentError(error, res, next);
  }
});

router.get("/:id/download-all", async (req, res, next) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = parseDocumentId(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid document id" });
  }
  try {
    const versions = req.silo!.services.documents.listVersions(params.data.id);
    const zip = new JSZip();
    await Promise.all(
      versions.map(async (versionInfo) => {
        const buffer = await req.silo!.services.documents.downloadVersionData(
          versionInfo,
        );
        const entryName = `v${versionInfo.version}-${versionInfo.fileName}`;
        zip.file(entryName, buffer);
      }),
    );
    const archive = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${params.data.id}-documents.zip"`,
    );
    return res.send(archive);
  } catch (error) {
    return handleDocumentError(error, res, next);
  }
});

export default router;
