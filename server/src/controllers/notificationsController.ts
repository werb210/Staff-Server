// server/src/controllers/notificationsController.ts
import type { Request, Response } from "express";
import { notificationsService } from "../services/notificationsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const notificationsController = {
  all: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await notificationsService.all() });
  }),
};
