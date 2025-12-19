import { Express, Request, Response } from "express";
import authRoutes from "./auth/auth.routes";
import bankingRoutes from "./banking/banking.routes";
import healthRoutes from "./routes/health";
import internalRoutes from "./routes/internal";
import publicRoutes from "./routes/public";
import intRoutes from "./routes/_int.routes";
import applicationsRoutes from "./routes/applications.routes";
import eventsRoutes from "./routes/events.routes";
import tasksRoutes from "./routes/tasks.routes";
import userRoutes from "./routes/users.routes";

export function registerRoutes(app: Express) {
  app.use("/api/_int", intRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/internal", internalRoutes);
  app.use("/api/banking", bankingRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api", healthRoutes);

  app.get("/api", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });
}
