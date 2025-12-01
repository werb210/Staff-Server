import { Request, Response } from "express";
import messagesRepo from "../db/repositories/messages.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const chatController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const messages = await messagesRepo.findMany({ applicationId });
    res.json(messages);
  }),

  send: asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body;
    const saved = await messagesRepo.create(payload);
    res.json(saved);
  }),
};

export default chatController;
