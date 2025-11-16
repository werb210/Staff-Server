// server/src/controllers/documentsController.ts
import type { Request, Response } from "express";
import { documentService } from "../services/documentService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const documentsController = {
  upload: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: "No file" });

    const result = await documentService.upload(file.buffer, file.originalname);
    res.json({ ok: true, uploaded: result });
  }),
};
