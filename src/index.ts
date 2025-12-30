import "dotenv/config";
import express from "express";
import http from "http";

import { assertDb, ensureSchema } from "./db";
import { registerRoutes } from "./routes";

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"] as const;
for (const k of requiredEnv) {
  if (!process.env[k]) {
    throw new Error(`missing_env:${k}`);
  }
}

async function bootstrap() {
  await assertDb();
  await ensureSchema();

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  registerRoutes(app);

  const server = http.createServer(app);
  const port = process.env.PORT || 8080;

  server.listen(port, () => {
    console.log(`server listening on ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("BOOTSTRAP_FATAL", err);
  process.exit(1);
});
