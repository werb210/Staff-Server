import { Express, Request, Response, Router } from "express";

import authRoutes from "./auth/auth.routes";
import bankingRoutes from "./banking/banking.routes";
import communicationsRoutes from "./communications/communications.routes";
import healthRoutes from "./routes/health";
import internalRoutes from "./routes/internal";
import notificationsRoutes from "./notifications/notifications.routes";
import publicRoutes from "./routes/public";
import userRoutes from "./routes/users.routes";

import applicationsRoutes from "./routes/applications.routes";
import eventsRoutes from "./routes/events.routes";
import ocrRoutes from "./ocr/ocr.routes";
import tasksRoutes from "./tasks/tasks.routes";
import pipelineRoutes from "./api/pipeline";
import { requireAuth } from "./middleware/auth";

const apiRouter = Router();

apiRouter.use("/banking", bankingRoutes);
apiRouter.use("/communications", communicationsRoutes);
apiRouter.use("/_int", internalRoutes);
apiRouter.get("/_int/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});
apiRouter.use("/notifications", notificationsRoutes);
apiRouter.use("/public", publicRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/applications", applicationsRoutes);
apiRouter.use("/events", eventsRoutes);
apiRouter.use("/ocr", ocrRoutes);
apiRouter.use("/tasks", tasksRoutes);
apiRouter.use("/pipeline", pipelineRoutes);
apiRouter.use("/", healthRoutes);

apiRouter.get("/", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

export function registerRoutes(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use(requireAuth);
  app.use("/api", apiRouter);
}

export default apiRouter;
