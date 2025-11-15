import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { applicationService } from "../services/applicationService.js";

const toSilo = (value: string): Silo => value as Silo;

// -----------------------------------------------------
// GET ALL APPLICATIONS FOR SILO
// -----------------------------------------------------
export const getApplications = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);

  const apps = applicationService.list(silo);
  return res.status(200).json({
    ok: true,
    silo,
    count: apps.length,
    applications: apps,
  });
};

// -----------------------------------------------------
// CREATE APPLICATION
// -----------------------------------------------------
export const createApplication = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const payload = req.body ?? {};

  const created = applicationService.create(silo, {
    ...payload,
    userId: req.user?.id ?? null,
  });

  return res.status(201).json({
    ok: true,
    silo,
    application: created,
  });
};

// -----------------------------------------------------
// GET BY ID
// -----------------------------------------------------
export const getApplicationById = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.appId;

  const app = applicationService.get(silo, id);
  if (!app) {
    return res.status(404).json({
      ok: false,
      error: "Application not found",
      id,
      silo,
    });
  }

  return res.status(200).json({
    ok: true,
    application: app,
  });
};

// -----------------------------------------------------
// UPDATE
// -----------------------------------------------------
export const updateApplication = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.appId;

  const updated = applicationService.update(silo, id, req.body ?? {});
  if (!updated) {
    return res.status(404).json({
      ok: false,
      error: "Application not found",
      id,
      silo,
    });
  }

  return res.status(200).json({
    ok: true,
    application: updated,
  });
};

// -----------------------------------------------------
// DELETE
// -----------------------------------------------------
export const deleteApplication = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.appId;

  const deleted = applicationService.delete(silo, id);
  if (!deleted) {
    return res.status(404).json({
      ok: false,
      error: "Application not found",
      id,
      silo,
    });
  }

  return res.status(200).json({
    ok: true,
    deleted: true,
  });
};
