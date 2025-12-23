import { Router } from "express";

const router = Router();

router.get("/contacts", (_req, res) => {
  res.json({ contacts: [] });
});

router.post("/contacts", (_req, res) => {
  res.status(201).json({ created: true });
});

export default router;
