import { Request, Response } from "express";
import applicationsRepo from "../db/repositories/applications.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const applicationController = {
  getOne: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const record = await applicationsRepo.findById(id);
    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(record);
  }),
};

export default applicationController;
