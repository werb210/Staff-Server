import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import http from "http";

/**
 * Build the Express application
 * MUST be exported for tests
 */
export function buildApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // ---- INTERNAL HEALTH CHECK (AZURE) ----
  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // ---- ROOT (OPTIONAL BUT SAFE) ----
  app.get("/", (_req, res) => {
    res.status(200).json({ service: "boreal-staff-server" });
  });

  return app;
}

/**
 * Initialize and start the HTTP server
 * MUST be exported for tests
 */
export function initializeServer(port: number): http.Server {
  const app = buildApp();

  const server = app.listen(port, () => {
    console.log(`Staff Server listening on port ${port}`);
  });

  return server;
}

/**
 * Production entrypoint
 */
if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  initializeServer(PORT);
}
