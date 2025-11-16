// server/src/controllers/applicationsController.ts

import type { Request, Response } from "express";
import {
  createApplicationRecord,
  getApplicationRecordById,
  updateApplicationRecord,
  deleteApplicationRecord,
  listAllApplications,
} from "../services/applicationService.js";

/**
 * ----------------------------------------------------
 * CONTROLLER: LIST APPLICATIONS
 * ----------------------------------------------------
 */
export async function listApplications(req: Request, res: Response) {
  const apps = await listAllApplications();
  res.json({ ok: true, data: apps });
}

/**
 * ----------------------------------------------------
 * CONTROLLER: CREATE APPLICATION
 * ----------------------------------------------------
 */
export async function createApplication(req: Request, res: Response) {
  const created = await createApplicationRecord(req.body);
  res.status(201).json({ ok: true, data: created });
}

/**
 * ----------------------------------------------------
 * CONTROLLER: GET APPLICATION BY ID
 * ----------------------------------------------------
 */
export async function getApplicationById(req: Request, res: Response) {
  const { id } = req.params;
  const app = await getApplicationRecordById(id);

  if (!app) {
    return res.status(404).json({ ok: false, error: "Application not found" });
  }

  res.json({ ok: true, data: app });
}

/**
 * ----------------------------------------------------
 * CONTROLLER: UPDATE APPLICATION
 * ----------------------------------------------------
 */
export async function updateApplication(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await updateApplicationRecord(id, req.body);

  res.json({ ok: true, data: updated });
}

/**
 * ----------------------------------------------------
 * CONTROLLER: DELETE APPLICATION
 * ----------------------------------------------------
 */
export async function deleteApplication(req: Request, res: Response) {
  const { id } = req.params;

  const deleted = await deleteApplicationRecord(id);
  res.json({ ok: true, data: deleted });
}

/**
 * ----------------------------------------------------
 * DEFAULT EXPORT (for index.ts wildcard)
 * ----------------------------------------------------
 */
export default {
  listApplications,
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
};
