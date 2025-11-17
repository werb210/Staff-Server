// server/src/controllers/productsController.ts
import { Request, Response } from "express";
import { productsService } from "../services/productsService.js";

export const productsController = {
  async list(req: Request, res: Response) {
    const rows = await productsService.list();
    res.json({ ok: true, data: rows });
  },

  async get(req: Request, res: Response) {
    const row = await productsService.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const row = await productsService.create(req.body);
    res.json({ ok: true, data: row });
  },

  async update(req: Request, res: Response) {
    const row = await productsService.update(req.params.id, req.body);
    res.json({ ok: true, data: row });
  },

  async remove(req: Request, res: Response) {
    await productsService.remove(req.params.id);
    res.json({ ok: true });
  },
};
