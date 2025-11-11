import { Router } from "express";
import { z } from "zod";
import {
  ApplicationAssignmentSchema,
  ApplicationCreateSchema,
  ApplicationPublishSchema,
  ApplicationStatusUpdateSchema,
  ApplicationSubmitSchema,
  ApplicationCompleteSchema,
  ApplicationUpdateSchema,
} from "../../schemas/application.schema.js";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

const ApplicationIdSchema = z.object({ id: z.string().uuid() });

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const view = req.query.view;
  const applications =
    view === "public"
      ? req.silo!.services.applications.listPublicApplications()
      : req.silo!.services.applications.listApplications();
  res.json({ message: "OK", data: applications, silo: req.silo?.silo });
});

router.get("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = ApplicationIdSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid application id" });
  }
  const application = req.silo!.services.applications.getApplication(params.data.id);
  res.json({ message: "OK", data: application });
});

router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = ApplicationCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid application payload" });
  }
  const created = req.silo!.services.applications.createApplication(parsed.data);
  res.status(201).json({ message: "OK", data: created });
});

router.put("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = ApplicationUpdateSchema.safeParse({ ...req.body, id: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid application update" });
  }
  const { id, ...updates } = parsed.data;
  const updated = req.silo!.services.applications.updateApplication(id, updates);
  res.json({ message: "OK", data: updated });
});

router.delete("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const params = ApplicationIdSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: "Invalid application id" });
  }
  const removed = req.silo!.services.applications.deleteApplication(params.data.id);
  res.json({ message: "OK", data: removed });
});

router.post("/:id/status", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = ApplicationStatusUpdateSchema.safeParse({
    id: req.params.id,
    status: req.body.status,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid status update" });
  }
  const updated = req.silo!.services.applications.updateStatus(
    parsed.data.id,
    parsed.data.status,
  );
  res.json({ message: "OK", data: updated });
});

router.post("/:id/assign", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = ApplicationAssignmentSchema.safeParse({
    id: req.params.id,
    assignedTo: req.body.assignedTo,
    stage: req.body.stage,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid assignment" });
  }
  const assigned = req.silo!.services.applications.assignApplication(
    parsed.data.id,
    parsed.data.assignedTo,
    parsed.data.stage,
  );
  res.json({ message: "OK", data: assigned });
});

router.post("/:id/publish", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = ApplicationPublishSchema.safeParse({
    id: req.params.id,
    publishedBy: req.body.publishedBy,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid publish payload" });
  }
  const published = req.silo!.services.applications.publishApplication(
    parsed.data.id,
    parsed.data.publishedBy,
  );
  res.json({ message: "OK", data: published });
});

router.post("/:id/submit", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = ApplicationSubmitSchema.safeParse({
    id: req.params.id,
    submittedBy: req.body.submittedBy,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid submit payload" });
  }
  const submitted = req.silo!.services.applications.submitApplication(
    parsed.data.id,
    parsed.data.submittedBy,
  );
  res.json({ message: "OK", data: submitted });
});

router.post("/:id/complete", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = ApplicationCompleteSchema.safeParse({
    id: req.params.id,
    completedBy: req.body.completedBy,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid completion payload" });
  }
  const completed = req.silo!.services.applications.completeApplication(
    parsed.data.id,
    parsed.data.completedBy,
  );
  res.json({ message: "OK", data: completed });
});

export default router;
