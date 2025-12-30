import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ system: "ok" });
});

export default router;
