import type { Request, Response } from "express";

import {
  ApplicationCreateSchema,
  ApplicationUpdateSchema,
  ApplicationStageUpdateSchema,
  ApplicationStatusUpdateSchema,
  ApplicationAssignmentSchema,
  ApplicationPublishSchema,
} from "../../schemas/application.schema.js";

import { DocumentUploadSchema } from "../../schemas/document.schema.js";

import {
  applicationService,
  type ApplicationServiceType,
} from "../../services/applicationService.js";

/* ---------------------------------------------------------
   Helper: Silo-aware service resolver
--------------------------------------------------------- */
function getService(req: Request): ApplicationServiceType {
  const siloReq = req as Request & {
    silo?: { services?: { applications?: ApplicationServiceType } };
  };

  return siloReq.silo?.services?.applications ?? applicationService;
}

/* ---------------------------------------------------------
   LIST ALL
--------------------------------------------------------- */
export const listApplications = (req: Request, res: Response) => {
  const service = getService(req);
  res.json(service.listApplications());
};

/* ---------------------------------------------------------
   GET
--------------------------------------------------------- */
export const getApplication = (req: Request, res: Response) => {
  const service = getService(req);
  res.json(service.getApplication(req.params.id));
};

/* ---------------------------------------------------------
   CREATE
--------------------------------------------------------- */
export const createApplication = (req: Request, res: Response) => {
  const service = getService(req);

  const parsed = ApplicationCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid application payload" });
  }

  const created = service.createApplication(parsed.data);
  res.status(201).json(created);
};

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */
export const updateApplication = (req: Request, res: Response) => {
  const service = getService(req);

  const parsed = ApplicationUpdateSchema.safeParse({
    id: req.params.id,
    ...req.body,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid application payload" });
  }

  const { id: _drop, ...updates } = parsed.data as any;
  const updated = service.updateApplication(req.params.id, updates);
  res.json(updated);
};

/* ---------------------------------------------------------
   UPDATE STAGE
--------------------------------------------------------- */
export const updateStage = (req: Request, res: Response) => {
  const service = getService(req);

  const parsed = ApplicationStageUpdateSchema.safeParse({
    id: req.params.id,
    ...req.body,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid stage payload" });
  }

  const updated = service.updateStage(req.params.id, parsed.data.stage);
  res.json(updated);
};

/* ---------------------------------------------------------
   UPDATE STATUS
--------------------------------------------------------- */
export const updateStatus = (req: Request, res: Response) => {
  const service = getService(req);

  const parsed = ApplicationStatusUpdateSchema.safeParse({
    id: req.params.id,
    ...req.body,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid status payload" });
  }

  const updated = service.updateStatus(req.params.id, parsed.data.status);
  res.json(updated);
};

/* ---------------------------------------------------------
   ASSIGN
--------------------------------------------------------- */
export const assignApplication = (req: Request, res: Response) => {
  const service = getService(req);

  const parsed = ApplicationAssignmentSchema.safeParse({
    id: req.params.id,
    ...req.body,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid assignment payload" });
  }

  const updated = service.assignApplication(
    req.params.id,
    parsed.data.assignedTo,
    parsed.data.stage,
  );

  res.json(updated);
};

/* ---------------------------------------------------------
   SUBMIT
--------------------------------------------------------- */
export const submitApplication = (req: Request, res: Response) => {
  const service = getService(req);
  const submittedBy = req.body.submittedBy ?? "system";
  res.json(service.submitApplication(req.params.id, submittedBy));
};

/* ---------------------------------------------------------
   COMPLETE
--------------------------------------------------------- */
export const completeApplication = (req: Request, res: Response) => {
  const service = getService(req);
  const completedBy = req.body.completedBy ?? "system";
  res.json(service.completeApplication(req.params.id, completedBy));
};

/* ---------------------------------------------------------
   PUBLISH
--------------------------------------------------------- */
export const publishApplication = (req: Request, res: Response) => {
  const service = getService(req);

  const parsed = ApplicationPublishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid publish payload" });
  }

  const output = service.publishApplication(
    req.params.id,
    parsed.data.publishedBy,
  );

  res.json(output);
};

/* ---------------------------------------------------------
   DELETE
--------------------------------------------------------- */
export const deleteApplication = (req: Request, res: Response) => {
  const service = getService(req);
  res.json(service.deleteApplication(req.params.id));
};

/* ---------------------------------------------------------
   UPLOAD DOCUMENT
   Required by POST /api/applications/upload
--------------------------------------------------------- */
export const uploadDocument = async (req: Request, res: Response) => {
  const silo = (req as any).silo;
  if (!silo?.services?.documents) {
    return res.status(500).json({ message: "Document service unavailable" });
  }

  const parsed = DocumentUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid upload payload" });
  }

  const saved = await silo.services.documents.save({
    ...parsed.data,
    data: Buffer.from([]),
  });

  res.status(201).json(saved);
};
