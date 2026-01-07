import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

import { assertEnv } from "./config";
import { errorHandler } from "./middleware/errors";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

if (!process.env.DB_POOL_CONNECTION_TIMEOUT_MS) {
  process.env.DB_POOL_CONNECTION_TIMEOUT_MS = "5000";
}

if (process.env.DATABASE_URL) {
  const rawUrl = process.env.DATABASE_URL;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
      process.env.DATABASE_URL = url.toString();
    }
  } catch {
    if (!rawUrl.includes("sslmode=")) {
      const separator = rawUrl.includes("?") ? "&" : "?";
      process.env.DATABASE_URL = `${rawUrl}${separator}sslmode=require`;
    }
  }
}

const PORT = Number(process.env.PORT) || 8080;
const isProduction = process.env.NODE_ENV === "production";
const apiTimeoutMs = Number(process.env.API_REQUEST_TIMEOUT_MS) || 10000;

export async function startServer() {
  try {
    assertEnv();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("ENV validation failed:", message);
  }

  if (!isProduction) {
    void (async () => {
      try {
        const { checkDb } = await import("./db");
        const { runMigrations } = await import("./migrations");
        await checkDb();
        await runMigrations();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("DB startup check failed:", message);
      }
    })();
  }
  console.log("BOOT OK");

  const app = express();

  app.use(cors());
  app.use(express.json());

  /* -------------------- HEALTH -------------------- */
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", (_req, res, next) => {
    res.setTimeout(apiTimeoutMs, () => {
      if (!res.headersSent) {
        res.status(504).json({ code: "timeout", message: "Request timed out." });
      }
    });
    next();
  });

  const { default: authRoutes } = await import("./routes/auth");
  const { default: usersRoutes } = await import("./routes/users");
  const { default: staffRoutes } = await import("./routes/staff");
  const { default: adminRoutes } = await import("./routes/admin");
  const { default: applicationsRoutes } = await import("./routes/applications");
  const { default: lenderRoutes } = await import("./routes/lender");
  const { default: clientRoutes } = await import("./routes/client");
  const { default: reportingRoutes } = await import("./routes/reporting");
  const { default: reportsRoutes } = await import("./routes/reports");

  /* -------------------- API ROUTES -------------------- */
  const apiRouter = express.Router();
  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/users", usersRoutes);
  apiRouter.use("/staff", staffRoutes);
  apiRouter.use("/admin", adminRoutes);
  apiRouter.use("/applications", applicationsRoutes);
  apiRouter.use("/lender", lenderRoutes);
  apiRouter.use("/client", clientRoutes);
  apiRouter.use("/reporting", reportingRoutes);
  apiRouter.use("/reports", reportsRoutes);
  app.use("/api", apiRouter);

  /* -------------------- API ERRORS (JSON ONLY) -------------------- */
  app.use("/api", (err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ ok: false, error: "invalid_json" });
      return;
    }
    next(err);
  });
  app.use("/api", errorHandler);

  /* -------------------- API 404 (JSON ONLY) -------------------- */
  app.all("/api", (req, res) => {
    res.status(404).json({ ok: false, error: "not_found", path: req.originalUrl });
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ ok: false, error: "not_found", path: req.originalUrl });
  });

  /* -------------------- SPA/STATIC (NON-API ONLY) -------------------- */
  const staticDir = path.join(process.cwd(), "public");
  const spaIndex = path.join(staticDir, "index.html");
  if (fs.existsSync(staticDir)) {
    const staticHandler = express.static(staticDir);
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      staticHandler(req, res, next);
    });
  }
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    if (!fs.existsSync(spaIndex)) {
      next();
      return;
    }
    res.sendFile(spaIndex);
  });

  /* -------------------- GLOBAL 404 (NON-API ONLY) -------------------- */
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.listen(PORT, () => {
    console.log(`Staff Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  void startServer();
}
