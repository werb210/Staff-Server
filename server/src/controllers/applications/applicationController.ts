import type { Request, Response } from "express";

import {
  ApplicationCreateSchema,
  ApplicationUpdateSchema,
  ApplicationStageUpdateSchema,
  ApplicationStatusUpdateSchema,
  ApplicationAssignmentSchema,
  ApplicationPublishSchema,
} from "../../schemas/application.schema.js";

import {
  applicationService,
  type ApplicationServiceType,
} from "../../services/applicationService.js";

/* ---------------------------------------------------------
   Helper: resolve correct ApplicationService (silo-aware)
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
  const apps = service.listApplications();
  res.json(apps);
};

/* ---------------------------------------------------------
   GET SINGLE
--------------------------------------------------------- */
export const getApplication = (req: Request, res: Response) => {
  const service = getService(req);
  const app = service.getApplication(req.params.id);
  res.json(app);
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

  // strip id before passing to service (it takes updates without id)
  const { id: _discard, ...updates } = parsed.data as any;

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

  const updated = service.submitApplication(req.params.id, submittedBy);
  res.json(updated);
};

/* ---------------------------------------------------------
   COMPLETE
--------------------------------------------------------- */
export const completeApplication = (req: Request, res: Response) => {
  const service = getService(req);
  const completedBy = req.body.completedBy ?? "system";

  const updated = service.completeApplication(req.params.id, completedBy);
  res.json(updated);
};

/* ---------------------------------------------------------
   PUBLISH (returns ApplicationPublic)
--------------------------------------------------------- */
export const publishApplication = (req: Request, res: Response) => {
  const service = getService(req);

  const parsed = ApplicationPublishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid publish payload" });
  }

  const published = service.publishApplication(
    req.params.id,
    parsed.data.publishedBy,
  );
  res.json(published);
};

/* ---------------------------------------------------------
   DELETE
--------------------------------------------------------- */
export const deleteApplication = (req: Request, res: Response) => {
  const service = getService(req);
  const deleted = service.deleteApplication(req.params.id);
  res.json(deleted);
};
