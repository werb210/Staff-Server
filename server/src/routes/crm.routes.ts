import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    service: "crm",
    status: "ok",
    message: "CRM route root"
  });
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
