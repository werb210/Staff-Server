import type { Express } from "express";

export function bootstrap(app: Express) {
  // FAST, GUARANTEED, NO DB, NO ASYNC
  app.get("/", (_req, res) => {
    res.status(200).send("OK");
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
}
