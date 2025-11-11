import { Router } from "express";

const router = Router();
const lenders: Record<string, any> = {};

// GET all lenders
router.get("/", (_req, res) => {
  res.json(Object.values(lenders));
});

// POST new lender
router.post("/", (req, res) => {
  const id = `${Date.now()}`;
  const lenderData = { id, ...req.body };
  lenders[id] = lenderData;
  res.status(201).json(lenderData);
});

export default router;
