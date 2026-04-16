import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../auth/capabilities.js";
import { safeHandler } from "../middleware/safeHandler.js";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.CALENDAR_READ]));

router.get("/", safeHandler(async (_req: any, res: any) => {
  res.status(200).json({ status: "ok", data: { items: [] } });
}));

router.get("/tasks", safeHandler(async (_req: any, res: any) => {
  res.status(200).json({ status: "ok", data: [] });
}));

router.get("/events", safeHandler(async (_req: any, res: any) => {
  res.status(200).json({ status: "ok", data: [] });
}));

router.post("/events", safeHandler(async (req: any, res: any) => {
  const id = randomUUID();
  res.status(201).json({ status: "ok", data: { id, ...req.body } });
}));

router.patch("/events/:id", safeHandler(async (req: any, res: any) => {
  res.status(200).json({ status: "ok", data: { id: req.params.id, ...req.body } });
}));

router.delete("/events/:id", safeHandler(async (_req: any, res: any) => {
  res.status(200).json({ status: "ok", data: null });
}));

export default router;
