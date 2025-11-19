// server/src/controllers/usersController.ts
import type { Request, Response } from "express";
import { usersService } from "../services/usersService.js";

export const usersController = {
  async list(_req: Request, res: Response) {
    res.json(await usersService.list());
  },

  async get(req: Request, res: Response) {
    res.json(await usersService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    res.json(await usersService.create(req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await usersService.update(req.params.id, req.body));
  },

  async remove(req: Request, res: Response) {
    res.json(await usersService.delete(req.params.id));
  },
};
