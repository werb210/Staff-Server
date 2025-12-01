import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import messagesRepo from "../db/repositories/messages.repo.js";

export const notificationsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await messagesRepo.findMany({}));
  }),
};

export default notificationsController;
