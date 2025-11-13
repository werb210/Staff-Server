import { Router } from "express";

import {
  ApplicationCreateSchema,
  ApplicationUpdateSchema,
  ApplicationStageUpdateSchema,
  ApplicationStatusUpdateSchema,
  ApplicationAssignmentSchema,
  ApplicationPublishSchema,
} from "../schemas/application.schema.js";

import {
  applicationService,
  type ApplicationServiceType,
} from "../services/applicationService.js";

const router = Router();

function getService(req: any): ApplicationServiceType {
  return req.silo?.services?.applications ?? applicationService;
}

/* ---------------------------------------------------------
   LIST ALL
--------------------------------------------------------- */
router.get("/", (req, res) => {
  const service = getService(req);
  res.json(service.listApplications());
});

/* ---------------------------------------------------------
   GET SINGLE
--------------------------------------------------------- */
router.get("/:id", (req, res) => {
  const service = getService(req);
  res.json(service.getApplication(req.params.id));
});

/* ---------------------------------------------------------
   CREATE
--------------------------------------------------------- */
router.post("/", (req, res) => {
  const service = getService(req);
  const parsed = ApplicationCreateSchema.parse(req.body);
  const created = service.createApplication(parsed);
  res.status(201).json(created);
});

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */
router.put("/:id", (req, res) => {
  const service = getService(req);
  const parsed = ApplicationUpdateSchema.parse({
    id: req.params.id,
    ...req.body,
  });
  const updated = service.updateApplication(req.params.id, parsed);
  res.json(updated);
});

/* ---------------------------------------------------------
   UPDATE STAGE
--------------------------------------------------------- */
router.post("/:id/stage", (req, res) => {
  const service = getService(req);
  const parsed = ApplicationStageUpdateSchema.parse({
    id: req.params.id,
    ...req.body,
  });
  const updated = service.updateStage(req.params.id, parsed.stage);
  res.json(updated);
});

/* ---------------------------------------------------------
   UPDATE STATUS
--------------------------------------------------------- */
router.post("/:id/status", (req, res) => {
  const service = getService(req);
  const parsed = ApplicationStatusUpdateSchema.parse({
    id: req.params.id,
    ...req.body,
  });
  const updated = service.updateStatus(req.params.id, parsed.status);
  res.json(updated);
});

/* ---------------------------------------------------------
   ASSIGN
--------------------------------------------------------- */
router.post("/:id/assign", (req, res) => {
  const service = getService(req);
  const parsed = ApplicationAssignmentSchema.parse({
    id: req.params.id,
    ...req.body,
  });
  const updated = service.assignApplication(
    req.params.id,
    parsed.assignedTo,
    parsed.stage
  );
  res.json(updated);
});

/* ---------------------------------------------------------
   SUBMIT
--------------------------------------------------------- */
router.post("/:id/submit", (req, res) => {
  const service = getService(req);
  const submittedBy = req.body.submittedBy ?? "system";
  const updated = service.submitApplication(req.params.id, submittedBy);
  res.json(updated);
});

/* ---------------------------------------------------------
   COMPLETE
--------------------------------------------------------- */
router.post("/:id/complete", (req, res) => {
  const service = getService(req);
  const completedBy = req.body.completedBy ?? "system";
  const updated = service.completeApplication(req.params.id, completedBy);
  res.json(updated);
});

/* ---------------------------------------------------------
   PUBLISH (returns ApplicationPublic)
--------------------------------------------------------- */
router.post("/:id/publish", (req, res) => {
  const service = getService(req);
  const parsed = ApplicationPublishSchema.parse(req.body);
  const published = service.publishApplication(
    req.params.id,
    parsed.publishedBy
  );
  res.json(published);
});

/* ---------------------------------------------------------
   DELETE
--------------------------------------------------------- */
router.delete("/:id", (req, res) => {
  const service = getService(req);
  const deleted = service.deleteApplication(req.params.id);
  res.json(deleted);
});

export default router;
