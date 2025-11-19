import type { Request, Response } from "express";
import { documentsService } from "../services/documentsService.js";

export const documentsController = {
  list: async (_req: Request, res: Response) => {
    res.json(await documentsService.list());
  },

  get: async (req: Request, res: Response) => {
    res.json(await documentsService.get(req.params.id));
  },

  create: async (req: Request, res: Response) => {
    res.json(await documentsService.create(req.body));
  },

  update: async (req: Request, res: Response) => {
    res.json(await documentsService.update(req.params.id, req.body));
  },

  remove: async (req: Request, res: Response) => {
    res.json(await documentsService.delete(req.params.id));
  },
};
