import { Router } from "express";

export const intRouter = Router();

intRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    ts: new Date().toISOString(),
  });
});

intRouter.get("/routes", (_req, res) => {
  res.json({
    mounted: ["/_int/health", "/_int/routes"],
  });
});
