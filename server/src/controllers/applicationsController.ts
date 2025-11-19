// server/src/controllers/applicationsController.ts
import type { Request, Response } from "express";
import { applicationsService } from "../services/applicationsService.js";

export const applicationsController = {
  async list(_req: Request, res: Response) {
    res.json(await applicationsService.list());
  },

  async get(req: Request, res: Response) {
    res.json(await applicationsService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    res.json(await applicationsService.create(req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await applicationsService.update(req.params.id, req.body));
  },

  async remove(req: Request, res: Response) {
    res.json(await applicationsService.delete(req.params.id));
  },
};
