import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { lenderService } from "../services/lenderService.js";

const toSilo = (value: string): Silo => value as Silo;

export const getLenderProducts = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const lenderId = req.params.lenderId;

  const products = await lenderService.listProducts(silo, lenderId);
  return res.json(products);
};

export const createLenderProduct = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const lenderId = req.params.lenderId;

  const created = await lenderService.createProduct(
    silo,
    lenderId,
    req.body ?? {}
  );

  return res.status(201).json(created);
};
