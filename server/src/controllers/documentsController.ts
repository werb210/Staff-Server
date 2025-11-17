// server/src/controllers/documentsController.ts
import { Request, Response } from "express";
import { documentsService } from "../services/documentsService.js";

export const documentsController = {
  async list(req: Request, res: Response) {
    const docs = await documentsService.list();
    res.json({ ok: true, data: docs });
  },

  async get(req: Request, res: Response) {
    const doc = await documentsService.get(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: doc });
  },

  async create(req: Request, res: Response) {
    const doc = await documentsService.create(req.body);
    res.json({ ok: true, data: doc });
  },

  async update(req: Request, res: Response) {
    const doc = await documentsService.update(req.params.id, req.body);
    res.json({ ok: true, data: doc });
  },

  async remove(req: Request, res: Response) {
    await documentsService.remove(req.params.id);
    res.json({ ok: true });
  },
};
