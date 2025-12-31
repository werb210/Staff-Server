import express from "express";
import type { Request, Response } from "express";

const PORT = Number(process.env.PORT) || 8080;

const app = express();

/* =========================
   LIVENESS — MUST BE FIRST
   ========================= */

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.get("/api/_int/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

/* =========================
   ROOT — MUST EXIST
   ========================= */

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "staff-server" });
});

/* =========================
   START LISTENING — NOW
   ========================= */

const server = app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

/* =========================
   SLOW / OPTIONAL INIT
   ========================= */

(async () => {
  try {
    // ⛔ DO NOT block startup
    // DB, migrations, cron, queues, etc go here

    // Example:
    // await initDb();
    // await initJobs();

    console.log("Background initialization completed");
  } catch (err) {
    console.error("Background init failed", err);
    // DO NOT exit process
  }
})();
