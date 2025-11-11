import { Router } from "express";
const router = Router();
const requirements: Record<string, any> = {};

router.get("/", (_req, res) => res.json(Object.values(requirements)));

router.post("/", (req, res) => {
  const id = `REQ-${Date.now()}`;
  requirements[id] = req.body;
  res.status(201).json(requirements[id]);
});

export default router;
