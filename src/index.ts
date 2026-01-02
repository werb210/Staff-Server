import express from "express";
import { dbWarm } from "./db";

const app = express();
const port = process.env.PORT || 8080;

/* Health = process alive ONLY (no DB) */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/* Ready = DB reachable */
app.get("/api/_int/ready", async (_req, res) => {
  try {
    await dbWarm();
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("READY FAILED", e);
    res.status(503).json({ ok: false });
  }
});

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

/* Warm AFTER listen; never crash */
setTimeout(async () => {
  try {
    await dbWarm();
  } catch (e) {
    console.error("DB warm FAILED", e);
  }
}, 3000);
