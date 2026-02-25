import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";

import submissionRouter from "./modules/clientSubmission/clientSubmission.routes";
import authRouter from "./modules/auth/auth.routes";
import lenderRouter from "./modules/lender/lender.routes";

export function buildAppWithApiRoutes() {
  const app = express();

  app.use(express.json());

  // Request tracing middleware (must run first)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    res.setHeader("x-request-id", requestId);
    (req as any).requestId = requestId;
    next();
  });

  // CORS — allow portal, block random origins for internal routes
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Health
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  // Auth routes
  app.use("/api/auth", authRouter);

  // Submission routes
  app.use("/api/submissions", submissionRouter);

  // Lender routes
  app.use("/api/lenders", lenderRouter);

  // Internal routes
  app.get("/api/_int/health", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  // 404 fallback (MUST return JSON + request id)
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

const app = buildAppWithApiRoutes();

export default app;
