import "dotenv/config";
import express from "express";
import { Router } from "express";

import { checkDbConnection } from "./db";
import { requireAuth } from "./middleware/auth";
import authRouter from "./modules/auth/auth.routes";
import usersRouter from "./modules/users/users.routes";

console.log("Server starting");

const app = express();

app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.get("/api/_int/ready", async (_req, res) => {
  const ready = await checkDbConnection();
  res.status(ready ? 200 : 503).type("text/plain").send(ready ? "ok" : "not_ready");
});

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRouter);

const protectedApi = Router();
protectedApi.use("/users", usersRouter);

app.use("/api", requireAuth, protectedApi);

console.log("Routes registered");

const port = Number(process.env.PORT);
if (!Number.isFinite(port)) {
  throw new Error("missing_env:PORT");
}

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
