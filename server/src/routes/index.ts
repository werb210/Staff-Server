import { Express } from "express";
import publicRoutes from "./public";

export function registerRoutes(app: Express) {
  app.use("/api", publicRoutes);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
}
