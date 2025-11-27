// server/src/controllers/notificationsController.ts
import type { Request, Response } from "express";
import { notificationsService } from "../services/notificationsService.js";
import asyncHandler from "../utils/asyncHandler.js";

function resolveUserId(req: Request, res: Response): string | null {
  const userId = (req.query.userId as string) ?? req.body?.userId;

  if (!userId) {
    res.status(400).json({ ok: false, error: "userId is required" });
    return null;
  }

  return String(userId);
}

export const notificationsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = resolveUserId(req, res);
    if (!userId) return;

    res.json(await notificationsService.list(userId));
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = resolveUserId(req, res);
    if (!userId) return;

    res.json(await notificationsService.create(userId, req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationsService.remove(req.params.id));
  }),
};
