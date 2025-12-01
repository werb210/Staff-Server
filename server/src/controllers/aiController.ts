import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";

export const aiController = {
  test: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true });
  }),
};

export default aiController;
