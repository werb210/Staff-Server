// server/src/controllers/lendersController.ts
import type { Request, Response } from "express";
import { lendersService } from "../services/lendersService.js";

export const lendersController = {
  async list(_req: Request, res: Response) {
    res.json(await lendersService.list());
  },

  async get(req: Request, res: Response) {
    res.json(await lendersService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    res.json(await lendersService.create(req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await lendersService.update(req.params.id, req.body));
  },

  async remove(req: Request, res: Response) {
    res.json(await lendersService.delete(req.params.id));
  },
};
