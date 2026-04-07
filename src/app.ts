import crypto from "crypto";
import express from "express";
import helmet from "helmet";

import authRouter from "./routes/auth";
import voiceRouter from "./routes/voice";
import publicRouter from "./routes/public";
import { registerApiRouteMounts } from "./routes/routeRegistry";
import { fail, ok } from "./lib/response";
import { getEnv } from "./config/env";
import routeAlias from "./middleware/routeAlias";
import { deps } from "./system/deps";

const allowedProductionHosts: string[] = ["server.boreal.financial"];

function voiceStatusHandler(req: express.Request, res: express.Response) {
  return res.json(ok({}, (req as any).rid));
}

async function callStartHandler(req: express.Request, res: express.Response) {
  const { to } = req.body as { to?: unknown };

  if (!to || typeof to !== "string") {
    return res.status(400).json(fail("invalid_payload", (req as any).rid));
  }

  try {
    return res.json(ok({ callId: `call_${Date.now()}`, status: "queued" }, (req as any).rid));
  } catch {
    return res.status(500).json(fail("call_start_failed", (req as any).rid));
  }
}

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    const rid = crypto.randomUUID();
    (req as any).rid = rid;
    (req as any).id = rid;
    res.setHeader("x-request-id", rid);
    next();
  });

  app.use((req, res, next) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("x-xss-protection", "1; mode=block");
    next();
  });

  app.use((req, res, next) => {
    deps.metrics.requests = (deps.metrics.requests + 1) % Number.MAX_SAFE_INTEGER;

    res.on("finish", () => {
      const entry = {
        level: "info",
        msg: "request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        rid: (req as any).rid,
      };
      try {
        console.log(JSON.stringify(entry));
      } catch {
        // no-op logging fallback
      }

      if (res.statusCode >= 400) {
        deps.metrics.errors = (deps.metrics.errors + 1) % Number.MAX_SAFE_INTEGER;
      }
    });

    next();
  });

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("access-control-allow-headers", "content-type, authorization");
      if (req.method === "OPTIONS") {
        return res.status(200).end();
      }
    }
    next();
  });

  app.get("/health", (req, res) => {
    return res.status(200).json(ok({}, (req as any).rid));
  });

  app.get("/ready", (req, res) => {
    if (!deps.db.ready) {
      return res.status(503).json(fail("not_ready", (req as any).rid));
    }
    return res.status(200).json(ok({}, (req as any).rid));
  });

  app.get("/api/_int/health", (req, res) => {
    res.json(ok({ uptime: process.uptime() }, (req as any).rid));
  });

  app.use((req, res, next) => {
    if (
      req.path === "/" ||
      req.path === "/health" ||
      req.path === "/ready" ||
      req.path === "/metrics" ||
      req.path === "/api/_int/health"
    ) {
      return next();
    }

    const raw = req.headers.host || "";
    const normalized = raw.split(":")[0];
    const { NODE_ENV } = getEnv();

    if (NODE_ENV !== "production") {
      if (normalized === "localhost" || normalized === "127.0.0.1") {
        return next();
      }
    }

    if (!allowedProductionHosts.includes(normalized)) {
      return res.status(403).send("Forbidden");
    }

    return next();
  });

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json());

  app.use(routeAlias);

  app.get("/", (_req, res) => {
    res.status(200).send("OK");
  });

  const apiHealthHandler = (req: any, res: any) => {
    const skipDb = process.env.SKIP_DB_CONNECTION === "true";
    if (!deps.db.ready && !skipDb) {
      return res.status(503).json(fail("DB_UNAVAILABLE", req.rid));
    }

    return res.status(200).json(ok({
      server: "ok",
      db: deps.db.ready ? "ok" : "degraded",
      twilio: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE ? "configured" : "missing",
    }, req.rid));
  };

  app.get("/api/health", apiHealthHandler);
  app.get("/api/v1/health", apiHealthHandler);

  app.get("/metrics", (req, res) => {
    return res.status(200).json(ok({ requests: deps.metrics.requests, errors: deps.metrics.errors }, (req as any).rid));
  });

  app.use("/api/auth", authRouter);
  app.use("/api/v1/auth", authRouter);

  app.use("/api/voice", voiceRouter);
  app.use("/api/v1/voice", voiceRouter);
  app.post("/api/voice/status", voiceStatusHandler);
  app.post("/api/v1/voice/status", voiceStatusHandler);

  app.post("/api/call/start", callStartHandler);
  app.post("/api/v1/call/start", callStartHandler);

  {
    let windowStart = Date.now();
    let count = 0;

    function limiter(req: express.Request, res: express.Response, next: express.NextFunction) {
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        count = 0;
      }

      count++;

      if (count > 100) {
        res.setHeader("retry-after", "1");
        return res.status(429).json(fail("Too many requests", (req as any).rid));
      }

      next();
    }

    app.use("/api/v1/public/test", limiter);
    app.use("/api/v1/public", publicRouter);
  }

  registerApiRouteMounts(app);

  app.use((req: any, res) => {
    res.status(404).json(fail("not_found", req.rid));
  });

  app.use((err: unknown, req: any, res: express.Response, _next: express.NextFunction) => {
    void err;
    return res.status(500).json({
      status: "error",
      error: "internal_error",
      rid: req.rid,
    });
  });

  return app;
}

export const app = createApp();

export function resetOtpStateForTests() {
  // OTP persistence is external/no-op for this router.
}
