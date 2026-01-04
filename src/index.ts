import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import http from "http";

export function buildApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/", (_req, res) => {
    res.status(200).json({ service: "boreal-staff-server" });
  });

  return app;
}

export function initializeServer(port: number): http.Server {
  const app = buildApp();

  const server = app.listen(port, () => {
    console.log(`Staff Server listening on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  initializeServer(PORT);
}
