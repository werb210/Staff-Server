// server/src/controllers/contactsController.ts
import type { Request, Response } from "express";
import { contactsService } from "../services/contactsService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const contactsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await contactsService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await contactsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await contactsService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await contactsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await contactsService.delete(req.params.id));
  }),
};
