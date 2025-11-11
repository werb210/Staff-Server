import { Router } from "express";
const router = Router();
const applications: Record<string, any> = {};

router.post("/", (req, res) => {
  const id = `APP-${Date.now()}`;
  const appData = { id, ...req.body };
  applications[id] = appData;
  res.status(201).json(appData);
});

router.get("/", (_req, res) => {
  res.json(Object.values(applications));
});

export default router;
