// server/src/controllers/usersController.ts

import { Request, Response } from "express";
import usersRepo from "../db/repositories/users.repo.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

export const usersController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const users = await usersRepo.findMany({});
    return res.json(users.map((u) => sanitizeUser(u)));
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await usersRepo.findById(id);

    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json(sanitizeUser(user));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const created = await usersRepo.create(req.body);
    return res.status(201).json(sanitizeUser(created));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const updated = await usersRepo.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json(sanitizeUser(updated));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const deleted = await usersRepo.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({ success: true });
  }),
};

export default usersController;
