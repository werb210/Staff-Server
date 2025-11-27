import type { Request, Response } from "express";
import { communicationService } from "../services/communicationService";
import { asyncHandler } from "../utils/asyncHandler";

export const communicationController = {
  listSMS: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await communicationService.listSMS() });
  }),

  listEmails: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await communicationService.listEmails() });
  }),
};
