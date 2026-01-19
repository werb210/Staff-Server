import { db } from "../db";
import { lenderProducts } from "../db/schema";
import { Request, Response } from "express";

export async function listLendersHandler(req: Request, res: Response) {
  const items = await db.select().from(lenderProducts);
  res.json({ items });
}

export async function createLenderHandler(req: Request, res: Response) {
  const {
    name,
    type,
    minAmount,
    maxAmount,
    interestRateMin,
    interestRateMax,
    termMinMonths,
    termMaxMonths,
    notes,
    active = true,
  } = req.body;

  const [created] = await db
    .insert(lenderProducts)
    .values({
      name,
      type,
      minAmount,
      maxAmount,
      interestRateMin,
      interestRateMax,
      termMinMonths,
      termMaxMonths,
      notes,
      active,
    })
    .returning();

  res.status(201).json({ item: created });
}
