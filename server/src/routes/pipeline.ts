import { Router } from "express";

const router = Router();
const pipelineCards: Record<string, any> = {};

// GET all pipeline cards
router.get("/", (_req, res) => {
  res.json(Object.values(pipelineCards));
});

// POST new card
router.post("/", (req, res) => {
  const id = `${Date.now()}`;
  const cardData = { id, ...req.body };
  pipelineCards[id] = cardData;
  res.status(201).json(cardData);
});

export default router;
