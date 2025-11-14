import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { applicationService } from "../services/applicationService.js";

const toSilo = (value: string): Silo => value as Silo;

export const getApplications = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);

  const apps = await applicationService.listBySilo(silo);
  return res.json(apps);
};

export const createApplication = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const payload = req.body ?? {};

  const created = await applicationService.create({
    ...payload,
    silo,
    userId: req.user?.id,
  });

  return res.status(201).json(created);
};

export const getApplicationById = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.appId;

  const app = await applicationService.getById(silo, id);
  if (!app) return res.status(404).json({ error: "Application not found" });

  return res.json(app);
};

export const updateApplication = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.appId;

  const updated = await applicationService.update(silo, id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "Application not found" });

  return res.json(updated);
};

export const deleteApplication = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.appId;

  const deleted = await applicationService.remove(silo, id);
  if (!deleted) return res.status(404).json({ error: "Application not found" });

  return res.json({ success: true });
};
