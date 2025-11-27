// server/src/controllers/communicationController.ts
import type { Request, Response } from "express";
import { communicationService } from "../services/communicationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const communicationController = {
  sms: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await communicationService.listSMS() });
  }),

  email: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await communicationService.listEmails() });
  }),
};
