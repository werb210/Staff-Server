// server/src/controllers/companiesController.ts
import { Request, Response } from "express";
import { companiesService } from "../services/companiesService.js";

export const companiesController = {
  async list(req: Request, res: Response) {
    const rows = await companiesService.list();
    res.json({ ok: true, data: rows });
  },

  async get(req: Request, res: Response) {
    const row = await companiesService.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const row = await companiesService.create(req.body);
    res.json({ ok: true, data: row });
  },

  async update(req: Request, res: Response) {
    const row = await companiesService.update(req.params.id, req.body);
    res.json({ ok: true, data: row });
  },

  async remove(req: Request, res: Response) {
    await companiesService.remove(req.params.id);
    res.json({ ok: true });
  },
};
