import { Router } from "express";
const router = Router();
const emails: Record<string, any> = {};

router.get("/", (_req, res) => res.json(Object.values(emails)));

router.post("/", (req, res) => {
  const id = `EM-${Date.now()}`;
  emails[id] = req.body;
  res.status(201).json(emails[id]);
});

export default router;
