import express from "express";

import { corsMiddleware } from "./middleware/cors";
import routes from "./routes";
import authRouter from "./routes/auth";
import { fail } from "./lib/response";

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    const host = req.headers.host || "";

    const allowedHosts = [
      "server.boreal.financial",
    ];

    if (process.env.NODE_ENV !== "production") {
      allowedHosts.push(
        "localhost:3000",
        "127.0.0.1:3000",
      );
    }

    if (!allowedHosts.includes(host)) {
      return res.status(403).send("Forbidden");
    }

    next();
  });

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(corsMiddleware);

  app.get("/", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "boreal-staff-server",
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).send("healthy");
  });

  app.get("/api/_int/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/v1", routes);

  app.use((_req, res) => fail(res, "not_found", 404));

  return app;
}

export function resetOtpStateForTests() {
  // No in-process OTP store is used by this app.
}

const app = createApp();

export default app;
