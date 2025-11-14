import type { Request, Response } from "express";
import {
  listLenders,
  listProductsForSilo,
} from "../../services/lenderService.js";

export async function fetchLenders(req: Request, res: Response) {
  const user = req.user;
  const { silo } = req.params;

  const lenders = await listLenders(user, silo as any);
  return res.json({ message: "OK", data: lenders });
}

export async function fetchLenderProducts(req: Request, res: Response) {
  const user = req.user;
  const { silo } = req.params;

  const products = await listProductsForSilo(user, silo as any);
  return res.json({ message: "OK", data: products });
}
