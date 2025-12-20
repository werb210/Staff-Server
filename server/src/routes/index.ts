import { Express } from "express";
import publicRoutes from "./public";
import internalRoutes from "./_int.routes";

const API_PREFIX = "/api";

export function registerRoutes(app: Express) {
  app.use(publicRoutes);
  app.use(`${API_PREFIX}/_int`, internalRoutes);

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok" });
  });
}
