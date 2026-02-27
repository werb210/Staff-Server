import express, { Express } from "express";
import cors from "cors";
import { json } from "body-parser";
import { initDb } from "./db/init";
import { applyMiddleware } from "./middleware/applyMiddleware";
import { registerApiRoutes } from "./routes";
import { ensureMigrations } from "./migrations";
import { isTestEnv } from "./utils/env";

export async function buildApp(): Promise<Express> {
  const app = express();

  app.use(cors());
  app.use(json());

  applyMiddleware(app);

  await initDb();
  if (!isTestEnv()) {
    await ensureMigrations();
  }

  registerApiRoutes(app);

  return app;
}

/**
 * TEST CONTRACT:
 * Must synchronously return an Express app
 * WITHOUT binding to a port
 * WITHOUT starting listeners
 */
export function buildAppWithApiRoutes(): Express {
  const app = express();

  app.use(cors());
  app.use(json());

  applyMiddleware(app);

  if (process.env.NODE_ENV === "test") {
    void initDb();
  }

  registerApiRoutes(app);

  return app;
}

export default buildApp;

export { registerApiRoutes } from "./routes";
