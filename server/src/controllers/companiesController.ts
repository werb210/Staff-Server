// server/src/controllers/companiesController.ts
import type { Request, Response } from "express";
import { companiesService } from "../services/companiesService.js";

export const companiesController = {
  async list(_req: Request, res: Response) {
    res.json(await companiesService.list());
  },

  async get(req: Request, res: Response) {
    res.json(await companiesService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    res.json(await companiesService.create(req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await companiesService.update(req.params.id, req.body));
  },

  async remove(req: Request, res: Response) {
    res.json(await companiesService.delete(req.params.id));
  },
};
