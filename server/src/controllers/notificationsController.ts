// server/src/controllers/notificationsController.ts
import { Request, Response } from "express";
import { notificationsService } from "../services/notificationsService.js";

export const notificationsController = {
  async list(req: Request, res: Response) {
    const rows = await notificationsService.list();
    res.json({ ok: true, data: rows });
  },

  async get(req: Request, res: Response) {
    const row = await notificationsService.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const row = await notificationsService.create(req.body);
    res.json({ ok: true, data: row });
  },

  async update(req: Request, res: Response) {
    const row = await notificationsService.update(req.params.id, req.body);
    res.json({ ok: true, data: row });
  },

  async remove(req: Request, res: Response) {
    await notificationsService.remove(req.params.id);
    res.json({ ok: true });
  },
};
