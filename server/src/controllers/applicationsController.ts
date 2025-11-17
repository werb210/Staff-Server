// server/src/controllers/applicationsController.ts
import { Request, Response } from "express";
import { applicationsService } from "../services/applicationsService.js";

export const applicationsController = {
  async list(req: Request, res: Response) {
    const apps = await applicationsService.list();
    res.json({ ok: true, data: apps });
  },

  async get(req: Request, res: Response) {
    const row = await applicationsService.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const row = await applicationsService.create(req.body);
    res.json({ ok: true, data: row });
  },

  async update(req: Request, res: Response) {
    const row = await applicationsService.update(req.params.id, req.body);
    res.json({ ok: true, data: row });
  },

  async remove(req: Request, res: Response) {
    await applicationsService.remove(req.params.id);
    res.json({ ok: true });
  },
};
