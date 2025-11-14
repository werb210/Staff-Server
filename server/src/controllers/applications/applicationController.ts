import type { Request, Response } from "express";
import {
  getApplication,
  listApplicationsForSilo,
  updateApplicationStage,
} from "../../services/applicationService.js";

export async function fetchApplication(req: Request, res: Response) {
  const user = req.user;
  const { id } = req.params;

  const app = await getApplication(user, id);
  if (!app) return res.status(404).json({ message: "Not found" });

  return res.json({ message: "OK", data: app });
}

export async function fetchApplicationsForSilo(req: Request, res: Response) {
  const user = req.user;
  const { silo } = req.params;

  const apps = await listApplicationsForSilo(user, silo as any);
  return res.json({ message: "OK", data: apps });
}

export async function changeApplicationStage(req: Request, res: Response) {
  const user = req.user;
  const { id } = req.params;
  const { stage } = req.body;

  const updated = await updateApplicationStage(user, id, stage);
  if (!updated) return res.status(404).json({ message: "Not found" });

  return res.json({ message: "OK", data: updated });
}
