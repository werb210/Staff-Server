import { Request, Response } from "express";
import applicationsRepo from "../db/repositories/applications.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const applicationsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const applications = await applicationsRepo.findMany({});
    res.json(applications);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body;
    const created = await applicationsRepo.create(payload);
    res.json(created);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;
    const updated = await applicationsRepo.update(id, payload);
    res.json(updated);
  }),
};

export default applicationsController;
