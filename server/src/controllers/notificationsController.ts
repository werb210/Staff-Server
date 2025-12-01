import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import messagesRepo from "../db/repositories/messages.repo.js";

export const notificationsController = {
  // GET /notifications
  list: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await messagesRepo.findMany({});
    res.json(rows);
  }),

  // GET /notifications/:id
  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const row = await messagesRepo.findById(id);

    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(row);
  }),

  // POST /notifications
  create: asyncHandler(async (req: Request, res: Response) => {
    const created = await messagesRepo.create(req.body);
    res.status(201).json(created);
  }),

  // PUT /notifications/:id
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await messagesRepo.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(updated);
  }),

  // DELETE /notifications/:id
  remove: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await messagesRepo.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  }),
};

export default notificationsController;
