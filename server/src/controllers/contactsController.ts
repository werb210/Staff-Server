// server/src/controllers/contactsController.ts
import { Request, Response } from "express";
import { contactsService } from "../services/contactsService.js";

export const contactsController = {
  async list(req: Request, res: Response) {
    const rows = await contactsService.list();
    res.json({ ok: true, data: rows });
  },

  async get(req: Request, res: Response) {
    const row = await contactsService.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const row = await contactsService.create(req.body);
    res.json({ ok: true, data: row });
  },

  async update(req: Request, res: Response) {
    const row = await contactsService.update(req.params.id, req.body);
    res.json({ ok: true, data: row });
  },

  async remove(req: Request, res: Response) {
    await contactsService.remove(req.params.id);
    res.json({ ok: true });
  },
};
