import { Request, Response } from "express";
import * as dealsService from "../services/dealsService.js";

export async function listDeals(req: Request, res: Response) {
  const deals = await dealsService.getDeals();
  return res.json(deals);
}

export async function createDeal(req: Request, res: Response) {
  const deal = await dealsService.createDeal(req.body);
  return res.status(201).json(deal);
}

export async function getDeal(req: Request, res: Response) {
  const deal = await dealsService.getDeal(req.params.id);
  if (!deal) return res.status(404).json({ error: "Deal not found" });
  return res.json(deal);
}

export async function updateDeal(req: Request, res: Response) {
  const deal = await dealsService.updateDeal(req.params.id, req.body);
  return res.json(deal);
}

export async function deleteDeal(req: Request, res: Response) {
  await dealsService.deleteDeal(req.params.id);
  return res.status(204).send();
}
