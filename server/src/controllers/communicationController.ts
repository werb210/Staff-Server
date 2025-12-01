import { Request, Response } from "express";
import messagesRepo from "../db/repositories/messages.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const communicationController = {
  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body;
    const message = await messagesRepo.create(payload);
    res.json(message);
  }),
};

export default communicationController;
