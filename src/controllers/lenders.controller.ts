import { db } from "../db";
import { lenderProducts } from "../db/schema";
import { Request, Response } from "express";

export async function listLendersHandler(req: Request, res: Response) {
  const items = await db.select().from(lenderProducts);
  res.json({ items });
}

export async function createLenderHandler(req: Request, res: Response) {
  const payload = req.body;

  const [created] = await db
    .insert(lenderProducts)
    .values({
      name: payload.name,
      type: payload.type,
      minAmount: payload.minAmount,
      maxAmount: payload.maxAmount,
      interestRateMin: payload.interestRateMin,
      interestRateMax: payload.interestRateMax,
      termMinMonths: payload.termMinMonths,
      termMaxMonths: payload.termMaxMonths,
      notes: payload.notes ?? null,
      active: payload.active ?? true,
    })
    .returning();

  res.status(201).json({ item: created });
}
