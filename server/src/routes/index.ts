import { Express } from "express";
import publicRoutes from "./public";

const API_PREFIX = "/api";

export function registerRoutes(app: Express) {
  app.use(publicRoutes);

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok" });
  });
}
