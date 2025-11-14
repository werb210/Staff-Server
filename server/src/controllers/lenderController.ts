import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { lenderService } from "../services/lenderService.js";

const toSilo = (value: string): Silo => value as Silo;

export const listLenders = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const lenders = await lenderService.list(silo);
  return res.json(lenders);
};

export const createLender = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);

  const created = await lenderService.create(silo, req.body ?? {});
  return res.status(201).json(created);
};

export const updateLender = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.lenderId;

  const updated = await lenderService.update(silo, id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "Lender not found" });

  return res.json(updated);
};

export const deleteLender = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.lenderId;

  const removed = await lenderService.remove(silo, id);
  if (!removed) return res.status(404).json({ error: "Lender not found" });

  return res.json({ success: true });
};
