// server/src/index.ts
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());

// CORS (safe default; tighten later)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/**
 * Always-on internal endpoints (no external imports; cannot “go missing”)
 */
app.get("/api/_int/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/_int/routes", (_req, res) => {
  // Keep this simple and always valid even if optional routers aren't mounted.
  res.json({
    ok: true,
    endpoints: [
      "GET  /api/_int/health",
      "GET  /api/_int/db",
      "GET  /api/_int/routes",
      "GET  /api/_int/mounted",
    ],
  });
});

/**
 * Best-effort DB check.
 * If your app has a db/pool module, we’ll use it.
 * If not, we still return a clear result instead of crashing the server.
 */
app.get("/api/_int/db", async (_req, res) => {
  try {
    // Optional: if you have server/dist/db/pool.js (or similar) in runtime.
    // We intentionally use require() so TypeScript doesn't fail the build
    // when the module doesn't exist yet.
    const poolMod =
      safeRequireAny("./db/pool.js") ||
      safeRequireAny("./db/pool/index.js") ||
      safeRequireAny("./db/index.js");

    const pool = poolMod?.pool || poolMod?.default || poolMod;
    if (!pool?.query) {
      return res.status(200).json({
        db: "unknown",
        reason: "no pool module found at ./db/pool(.js) / ./db/index(.js)",
      });
    }

    await pool.query("select 1 as ok");
    return res.status(200).json({ db: "ok" });
  } catch (err: any) {
    return res.status(500).json({
      db: "error",
      error: err?.message || String(err),
    });
  }
});

/**
 * Show what optional routers actually mounted (runtime truth).
 */
app.get("/api/_int/mounted", (_req, res) => {
  const stack = (app as any)?._router?.stack || [];
  const routes: string[] = [];

  for (const layer of stack) {
    if (layer?.route?.path && layer?.route?.methods) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());
      routes.push(`${methods.join(",")} ${layer.route.path}`);
    }
  }

  res.json({ routes });
});

/**
 * Optional routers: mount if present, but NEVER break build/deploy if missing.
 * This is the root fix for your “one missing module breaks everything” problem.
 */
mountOptionalRouter("/api/auth", "./api/auth/index.js");
mountOptionalRouter("/api/users", "./api/users/index.js");
mountOptionalRouter("/api/crm", "./api/crm/index.js");

// Root
app.get("/", (_req, res) => res.status(200).send("OK"));

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

/**
 * Error handler
 */
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(500).json({
      error: "Server Error",
      message: err?.message || String(err),
    });
  }
);

const port = normalizePort(process.env.PORT) ?? 8080;
app.listen(port, () => {
  // Must match what you see in Azure logs
  console.log(`Staff-Server running on port ${port}`);
});

function normalizePort(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function safeRequireAny(p: string): any | null {
  try {
    return require(p);
  } catch {
    return null;
  }
}

function mountOptionalRouter(mountPath: string, modulePath: string) {
  const mod = safeRequireAny(modulePath);
  const router = mod?.default || mod?.router || mod;

  if (router && typeof router === "function") {
    app.use(mountPath, router);
    console.log(`Mounted ${mountPath} -> ${modulePath}`);
  } else {
    console.log(`Skipped ${mountPath} (missing or invalid): ${modulePath}`);
  }
}
