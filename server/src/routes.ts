import { Express, Request, Response } from "express";

import authRoutes from "./auth/auth.routes";
import bankingRoutes from "./banking/banking.routes";
import communicationsRoutes from "./communications/communications.routes";
import healthRoutes from "./routes/health";
import internalRoutes from "./routes/internal";
import notificationsRoutes from "./notifications/notifications.routes";
import publicRoutes from "./routes/public";
import userRoutes from "./routes/users.routes";

import applicationsRoutes from "./applications/applications.routes";
import eventsRoutes from "./routes/events.routes";
import ocrRoutes from "./ocr/ocr.routes";
import tasksRoutes from "./tasks/tasks.routes";

export function registerRoutes(app: Express) {
  // Core namespaces
  app.use("/api/auth", authRoutes);
  app.use("/api/banking", bankingRoutes);
  app.use("/api/communications", communicationsRoutes);
  app.use("/api/internal", internalRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/users", userRoutes);

  // Business routes required by portal
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/ocr", ocrRoutes);
  app.use("/api/tasks", tasksRoutes);

  // Health + root
  app.use("/api", healthRoutes);

  app.get("/api", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });
}
