import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/routes", (_req, res) => {
  res.json(["/api/_int/health", "/api/_int/routes"]);
});

export default router;
