import type { Request, Response } from "express";
import { dealsService } from "../services/dealsService.js";

export const dealsController = {
  list: async (_req: Request, res: Response) => {
    res.json(await dealsService.list());
  },

  get: async (req: Request, res: Response) => {
    res.json(await dealsService.get(req.params.id));
  },

  create: async (req: Request, res: Response) => {
    res.json(await dealsService.create(req.body));
  },

  update: async (req: Request, res: Response) => {
    res.json(await dealsService.update(req.params.id, req.body));
  },

  remove: async (req: Request, res: Response) => {
    res.json(await dealsService.remove(req.params.id));
  },
};
