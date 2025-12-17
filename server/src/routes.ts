import { Express, Request, Response } from "express";

export function registerRoutes(app: Express) {
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "healthy" });
  });
}
