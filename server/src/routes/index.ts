import { Express } from "express";

import applicationsRouter from "../applications/applications.routes";
import crmRouter from "../communications/communications.routes";
import lendersRouter from "../api/lenders";
import tasksRouter from "../tasks/tasks.routes";
import { requireAuth } from "../middleware/requireAuth";
import publicRoutes from "./public";
import eventsRouter from "./events.routes";
import internalRoutes from "./_int.routes";

const API_PREFIX = "/api";

export function registerRoutes(app: Express) {
  app.use(publicRoutes);
  app.use(`${API_PREFIX}/_int`, internalRoutes);

  app.use(`${API_PREFIX}/applications`, requireAuth, applicationsRouter);
  app.use(`${API_PREFIX}/crm`, requireAuth, crmRouter);
  app.use(`${API_PREFIX}/events`, requireAuth, eventsRouter);
  app.use(`${API_PREFIX}/tasks`, requireAuth, tasksRouter);
  app.use(`${API_PREFIX}/lenders`, requireAuth, lendersRouter);

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok" });
  });
}
