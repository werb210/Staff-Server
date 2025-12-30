import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

/* ============================
   RUNTIME STATE
============================ */

const runtime = {
  envValid: true,
  dbConnected: false,
  missingEnv: [] as string[],
};

/* ============================
   REQUIRED ENV
============================ */

const REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    runtime.envValid = false;
    runtime.missingEnv.push(key);
  }
}

console.log("BOOT: env check complete", {
  envValid: runtime.envValid,
  missingEnv: runtime.missingEnv,
});

/* ============================
   DATABASE (NON-FATAL)
============================ */

let db: Pool | null = null;

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn("DB skipped: DATABASE_URL missing");
    return;
  }

  try {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
    await db.query("SELECT 1");
    runtime.dbConnected = true;
    console.log("DB connected");
  } catch (err) {
    runtime.dbConnected = false;
    console.error("DB connection failed", err);
  }
}

/* ============================
   EXPRESS
============================ */

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* REQUEST LOGGING */
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/* ============================
   ROUTES
============================ */

app.get("/", (_req, res) => {
  res.status(200).send("Staff Server OK");
});

app.get("/_int/health", (_req, res) => {
  res.json({
    process: "alive",
    envValid: runtime.envValid,
    dbConnected: runtime.dbConnected,
    missingEnv: runtime.missingEnv,
  });
});

/* ============================
   START
============================ */

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});

/* ============================
   HEARTBEAT (PROVES LIVENESS)
============================ */

setInterval(() => {
  console.log("HEARTBEAT", {
    envValid: runtime.envValid,
    dbConnected: runtime.dbConnected,
  });
}, 30_000);

/* ============================
   ASYNC INIT
============================ */

initDb();
