import { Router } from "express";
import { pool } from "../db";

export const internalRouter = Router();

internalRouter.get("/api/_int/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

internalRouter.get("/api/_int/ready", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.status(200).type("text/plain").send("ok");
  } catch {
    res.status(503).type("text/plain").send("not ready");
  }
});
