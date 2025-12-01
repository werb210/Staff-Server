import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import documentsRepo from "../db/repositories/documents.repo.js";

export const documentController = {
  getOne: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const doc = await documentsRepo.findById(id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  }),
};

export default documentController;
