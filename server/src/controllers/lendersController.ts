import type { Request, Response } from "express";
import type { Silo } from "../services/prisma.js";
import { lenderService } from "../services/lenderService.js";

const toSilo = (value: string): Silo => value as Silo;

export const getLenderProducts = async (req: Request, res: Response) => {
  const user = req.user!;
  const silo = toSilo(req.params.silo);
  const lenderId = req.params.lenderId;

  const products = await lenderService.listProducts(user, silo, lenderId);
  return res.json(products);
};

export const createLenderProduct = async (req: Request, res: Response) => {
  const user = req.user!;
  const silo = toSilo(req.params.silo);
  const lenderId = req.params.lenderId;

  const created = await lenderService.createProduct(
    user,
    silo,
    lenderId,
    req.body ?? {}
  );

  if (!created) return res.status(404).json({ error: "Lender not found" });

  return res.status(201).json(created);
};
