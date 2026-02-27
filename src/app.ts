import express from "express";
import { registerRoutes } from "./routes";
import { initDb } from "./db/init";
import { applyMiddleware } from "./middleware";

export async function buildApp() {
  const app = express();

  applyMiddleware(app);

  await initDb();

  registerRoutes(app);

  return app;
}

export default buildApp;
