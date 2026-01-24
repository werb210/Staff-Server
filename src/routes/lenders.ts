import { Router } from "express";
import { db } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  const lenders = await db.lenders.findMany({
    include: {
      products: true,
    },
  });

  const normalized = lenders.map((l) => ({
    id: l.id,
    name: l.name ?? "—",
    country: l.country ?? null,
    submission_method: Array.isArray(l.submission_method)
      ? l.submission_method
      : [],
    products: Array.isArray(l.products) ? l.products : [],
  }));

  res.json(normalized);
});

export default router;
