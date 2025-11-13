import { Router } from "express";
import { z } from "zod";

import {
  ApplicationCreateSchema,
  ApplicationUpdateSchema,
  ApplicationStatusUpdateSchema,
  ApplicationSubmitSchema,
  ApplicationCompleteSchema,
  ApplicationStageUpdateSchema,
  ApplicationPublicSchema,
  ApplicationSchema,
} from "../../schemas/application.schema.js";

import { DocumentUploadSchema } from "../../schemas/document.schema.js";
import {
  isPlaceholderSilo,
  respondWithPlaceholder,
} from "../../utils/placeholder.js";

const router = Router();

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

const ApplicationIdSchema = z.object({ id: z.string().uuid() });

/* ---------------------------------------------------------
   List applications
--------------------------------------------------------- */
router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const view = req.query.view;

  const results =
    view === "public"
      ? req.silo!.services.applications.listPublic()
      : req.silo!.services.applications.listAll();

  res.json({ message: "OK", data: results, silo: req.silo?.silo });
});

/* ---------------------------------------------------------
   Get application by ID
--------------------------------------------------------- */
router.get("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const params = ApplicationIdSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ message: "Invalid application id" });

  const app = req.silo!.services.applications.get(params.data.id);
  res.json({ message: "OK", data: app });
});

/* ---------------------------------------------------------
   Create application
--------------------------------------------------------- */
router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const parsed = ApplicationCreateSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid application payload" });

  const created = req.silo!.services.applications.create(parsed.data);
  res.status(201).json({ message: "OK", data: created });
});

/* ---------------------------------------------------------
   Update application
--------------------------------------------------------- */
router.put("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const parsed = ApplicationUpdateSchema.safeParse({
    ...req.body,
    id: req.params.id,
  });

  if (!parsed.success)
    return res.status(400).json({ message: "Invalid application update" });

  const { id, ...updates } = parsed.data;
  const updated = req.silo!.services.applications.update(id, updates);

  res.json({ message: "OK", data: updated });
});

/* ---------------------------------------------------------
   Delete application
--------------------------------------------------------- */
router.delete("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const params = ApplicationIdSchema.safeParse(req.params);
  if (!params.success)
    return res.status(400).json({ message: "Invalid application id" });

  const removed = req.silo!.services.applications.delete(params.data.id);
  res.json({ message: "OK", data: removed });
});

/* ---------------------------------------------------------
   Update status
--------------------------------------------------------- */
router.post("/:id/status", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const parsed = ApplicationStatusUpdateSchema.safeParse({
    id: req.params.id,
    status: req.body.status,
  });

  if (!parsed.success)
    return res.status(400).json({ message: "Invalid status update" });

  const updated = req.silo!.services.applications.setStatus(
    parsed.data.id,
    parsed.data.status,
  );

  res.json({ message: "OK", data: updated });
});

/* ---------------------------------------------------------
   Update stage
--------------------------------------------------------- */
router.post("/:id/stage", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const parsed = ApplicationStageUpdateSchema.safeParse({
    id: req.params.id,
    stage: req.body.stage,
  });

  if (!parsed.success)
    return res.status(400).json({ message: "Invalid stage update" });

  const updated = req.silo!.services.applications.setStage(
    parsed.data.id,
    parsed.data.stage,
  );

  res.json({ message: "OK", data: updated });
});

/* ---------------------------------------------------------
   Submit application
--------------------------------------------------------- */
router.post("/:id/submit", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const parsed = ApplicationSubmitSchema.safeParse({
    id: req.params.id,
    submittedBy: req.body.submittedBy,
  });

  if (!parsed.success)
    return res.status(400).json({ message: "Invalid submit payload" });

  const submitted = req.silo!.services.applications.submit(
    parsed.data.id,
    parsed.data.submittedBy,
  );

  res.json({ message: "OK", data: submitted });
});

/* ---------------------------------------------------------
   Complete application
--------------------------------------------------------- */
router.post("/:id/complete", (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const parsed = ApplicationCompleteSchema.safeParse({
    id: req.params.id,
    completedBy: req.body.completedBy,
  });

  if (!parsed.success)
    return res.status(400).json({ message: "Invalid completion payload" });

  const completed = req.silo!.services.applications.complete(
    parsed.data.id,
    parsed.data.completedBy,
  );

  res.json({ message: "OK", data: completed });
});

/* ---------------------------------------------------------
   Upload Document
--------------------------------------------------------- */

const UploadSchema = z.object({
  applicationId: DocumentUploadSchema.shape.applicationId,
  documentId: DocumentUploadSchema.shape.documentId.optional(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  uploadedBy: DocumentUploadSchema.shape.uploadedBy,
  note: DocumentUploadSchema.shape.note,
});

router.post("/upload", async (req, res) => {
  if (isPlaceholderSilo(req)) return respondWithPlaceholder(res);

  const parsed = UploadSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid upload payload" });

  const saved = await req.silo!.services.documents.save({
    applicationId: parsed.data.applicationId,
    documentId: parsed.data.documentId,
    fileName: parsed.data.fileName,
    contentType: parsed.data.contentType,
    uploadedBy: parsed.data.uploadedBy,
    note: parsed.data.note,
    data: Buffer.from([]), // actual file injected later by middleware
  });

  res.status(201).json({ message: "OK", data: saved });
});

export default router;
