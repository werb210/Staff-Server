import { Router } from "express";

export const intRouter = Router();

intRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

intRouter.get("/routes", (_req, res) => {
  res.status(200).json({
    routes: [
      "/_int/health",
      "/_int/routes",
    ],
  });
});
