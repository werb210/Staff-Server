import type { Request, Response } from "express";
import { notificationsService } from "../services/notificationsService";
import asyncHandler from "../utils/asyncHandler";

export const notificationsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ ok: false, error: "userId is required" });
      return;
    }

    res.json(await notificationsService.list(userId));
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { userId, ...data } = req.body;
    res.json(await notificationsService.create(userId, data));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationsService.remove(req.params.id));
  }),
};
