import { Express, Request, Response } from "express";
import authRoutes from "./auth/auth.routes";
import bankingRoutes from "./banking/banking.routes";
import healthRoutes from "./routes/health";
import internalRoutes from "./routes/internal";
import publicRoutes from "./routes/public";

export function registerRoutes(app: Express) {
  app.use("/api/public", publicRoutes);
  app.use("/api/internal", internalRoutes);
  app.use("/api/banking", bankingRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api", healthRoutes);

  app.get("/", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "healthy" });
  });
}
