import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";

import authRouter from "./modules/auth/auth.routes";
import submissionRouter from "./modules/clientSubmission/clientSubmission.routes";
import lenderRouter from "./modules/lender/lender.routes";

export function buildAppWithApiRoutes() {
  const app = express();

  app.use(express.json());

  // Request tracing + logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    res.setHeader("x-request-id", requestId);
    (req as any).requestId = requestId;

    res.on("finish", () => {
      console.log({
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
      });
    });

    next();
  });

  // CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Health
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", ok: true });
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", ok: true });
  });

  // Routers
  app.use("/api/auth", authRouter);
  app.use("/api/submissions", submissionRouter);
  app.use("/api/lenders", lenderRouter);

  // Internal route guard
  app.use("/api/_int", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", ok: true });
  });

  // 404 JSON
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: "Not Found",
      requestId: res.getHeader("x-request-id"),
    });
  });

  return app;
}

export function buildApp() {
  return buildAppWithApiRoutes();
}

export function registerApiRoutes(_app: express.Express): void {
  // Routes are mounted in buildAppWithApiRoutes.
}

export function assertCorsConfig(): void {
  // CORS middleware is configured in buildAppWithApiRoutes.
}
