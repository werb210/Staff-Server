import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRoutes from "../routes/auth.routes";
import applicationRoutes from "../routes/applications.routes";
import documentRoutes from "../routes/documents";

export function createServer() {
  const app = express();

  app.use((req, _res, next) => {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use((req, _res, next) => {
    console.log("[HEADERS]", {
      origin: req.headers.origin,
      auth: req.headers.authorization,
    });
    next();
  });

  // MUST remain first: bypasses middleware stack and guarantees probe completion.
  app.use((req, res, next) => {
    if (req.path === "/health") {
      res.status(200).type("text/plain").send("ok");
      return;
    }
    next();
  });

  // Explicit health route for direct GET semantics.
  app.get("/health", (_req, res) => {
    res.status(200).type("text/plain").send("ok");
  });

  app.get("/__test", (_req, res) => {
    res.status(200).json({
      ok: true,
      message: "server reachable",
      ts: Date.now(),
    });
  });

  app.use(express.json({ strict: false }));

  const allowedOrigins = [
    "https://boreal-financial-portal.azurewebsites.net",
    "https://boreal-client.azurewebsites.net",
    "http://localhost:5173",
  ];

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) {
          cb(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          cb(null, true);
          return;
        }

        cb(new Error("CORS BLOCKED"));
      },
      credentials: true,
    }),
  );

  const otpLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
  });

  if (!authRoutes) {
    throw new Error("authRoutes failed to load");
  }

  if (!applicationRoutes) {
    throw new Error("applicationRoutes failed to load");
  }

  const apiRouter = express.Router();

  apiRouter.get("/__ping", (_req, res) => {
    res.json({ ok: true });
  });

  apiRouter.use("/auth/otp", otpLimiter);
  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/applications", applicationRoutes);
  apiRouter.use("/documents", documentRoutes);

  app.use("/api", apiRouter);
  console.log("API ROUTES MOUNTED AT /api");

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[ERROR]", err);
    res.status(500).json({
      error: "internal_error",
    });
  });

  app.use((req, res) => {
    console.warn(`[MISS] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "not_found" });
  });

  return app;
}

export default createServer;
