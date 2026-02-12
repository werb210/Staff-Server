import type { Request, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

const knowledgeDocs: Array<{
  id: string;
  filename: string;
  buffer: Buffer;
  uploadedAt: number;
}> = [];

export const AIKnowledgeController = {
  upload(req: Request, res: Response): void {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    knowledgeDocs.push({
      id: uuid(),
      filename: file.originalname,
      buffer: file.buffer,
      uploadedAt: Date.now(),
    });

    res.json({ success: true });
  },

  list(_req: Request, res: Response): void {
    res.json({
      documents: knowledgeDocs.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        uploadedAt: doc.uploadedAt,
      })),
    });
  },
};
