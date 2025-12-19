// ===============================
// FILE: server/src/routes/applications.routes.ts
// ===============================

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res) => {
  res.json([]);
});

export default router;


// ===============================
// FILE: server/src/routes.ts
// ===============================

import { Express, Request, Response } from "express";
import authRoutes from "./routes/auth.routes";
import bankingRoutes from "./banking/banking.routes";
import healthRoutes from "./routes/health";
import internalRoutes from "./routes/internal";
import publicRoutes from "./routes/public";
import userRoutes from "./routes/users.routes";
import eventsRoutes from "./routes/events.routes";
import tasksRoutes from "./routes/tasks.routes";
import applicationsRoutes from "./routes/applications.routes";

export function registerRoutes(app: Express) {
  app.use("/api/_int", internalRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/internal", internalRoutes);
  app.use("/api/banking", bankingRoutes);
  app.use("/api/auth", authRoutes);

  app.use("/api/events", eventsRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/users", userRoutes);

  app.get("/api", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });
}
