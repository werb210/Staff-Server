// server/src/controllers/notificationsController.ts
import type { Request, Response } from "express";
import notificationsService from "../services/notificationsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const notificationsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await notificationsService.list();
    res.json({ ok: true, data });
  }),
};
