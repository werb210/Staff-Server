import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import lendersRepo from "../db/repositories/lenders.repo.js";

export const lenderController = {
  getOne: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const record = await lendersRepo.findById(id);
    if (!record) return res.status(404).json({ error: "Not found" });
    res.json(record);
  }),
};

export default lenderController;
