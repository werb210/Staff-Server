import "dotenv/config";
import express from "express";
import cors from "cors";

import authRouter from "./api/auth/index.js";
import usersRouter from "./api/users/index.js";
import intRouter from "./api/_int/index.js";
import crmRouter from "./api/crm/index.js";

const app = express();

/* ───────────────────────────────
   Core middleware
─────────────────────────────── */
app.set("trust proxy", true);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

/* ───────────────────────────────
   Health root
─────────────────────────────── */
app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "staff-server" });
});

/* ───────────────────────────────
   API ROUTE MOUNTS  ← THIS WAS MISSING
─────────────────────────────── */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/_int", intRouter);
app.use("/api/crm", crmRouter);

/* ───────────────────────────────
   404 JSON fallback
─────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

/* ───────────────────────────────
   Start server
─────────────────────────────── */
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
