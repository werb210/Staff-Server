// server/src/controllers/contactsController.ts
import type { Request, Response } from "express";
import { contactsService } from "../services/contactsService.js";

export const contactsController = {
  async list(_req: Request, res: Response) {
    res.json(await contactsService.list());
  },

  async get(req: Request, res: Response) {
    res.json(await contactsService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    res.json(await contactsService.create(req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await contactsService.update(req.params.id, req.body));
  },

  async remove(req: Request, res: Response) {
    res.json(await contactsService.delete(req.params.id));
  },
};
