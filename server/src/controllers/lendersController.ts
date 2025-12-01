import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import lendersRepo from "../db/repositories/lenders.repo.js";

export const lendersController = {
  // GET /lenders
  list: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await lendersRepo.findMany({});
    res.json(rows);
  }),

  // GET /lenders/:id
  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const lender = await lendersRepo.findById(id);

    if (!lender) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(lender);
  }),

  // POST /lenders
  create: asyncHandler(async (req: Request, res: Response) => {
    const created = await lendersRepo.create(req.body);
    res.status(201).json(created);
  }),

  // PUT /lenders/:id
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await lendersRepo.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(updated);
  }),

  // DELETE /lenders/:id
  remove: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await lendersRepo.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  }),
};

export default lendersController;
