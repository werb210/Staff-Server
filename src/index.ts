import express from "express";
import { dbWarm } from "./db";

const app = express();
const port = process.env.PORT || 8080;

/**
 * INTERNAL HEALTH
 * MUST NEVER TOUCH DB
 */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "staff-server" });
});

/**
 * INTERNAL READY
 * DB CHECK HAPPENS HERE ONLY
 */
app.get("/api/_int/ready", async (_req, res) => {
  try {
    await dbWarm();
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("READY FAILED", err);
    res.status(503).json({ ok: false });
  }
});

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

/**
 * WARM DB AFTER LISTEN
 * FAILURE MUST NOT CRASH PROCESS
 */
setTimeout(async () => {
  try {
    await dbWarm();
  } catch (err) {
    console.error("DB warm FAILED", err);
  }
}, 3000);
