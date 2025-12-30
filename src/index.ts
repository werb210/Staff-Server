import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

/* ============================
   RUNTIME STATE (NO EXITS)
   ============================ */

const runtimeState = {
  envValid: true,
  dbConnected: false,
  missingEnv: [] as string[],
};

/* ============================
   REQUIRED ENV VARS
   ============================ */

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

/* ============================
   ENV VALIDATION (NON-FATAL)
   ============================ */

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    runtimeState.envValid = false;
    runtimeState.missingEnv.push(key);
  }
}

if (!runtimeState.envValid) {
  console.error("⚠️ ENV VARS MISSING:", runtimeState.missingEnv);
}

/* ============================
   DATABASE (NON-FATAL)
   ============================ */

let db: Pool | null = null;

async function initDb() {
  if (!process.env.DATABASE_URL) return;

  try {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
    await db.query("SELECT 1");
    runtimeState.dbConnected = true;
    console.log("✅ Database connected");
  } catch (err) {
    runtimeState.dbConnected = false;
    console.error("❌ Database connection failed");
  }
}

/* ============================
   EXPRESS APP
   ============================ */

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* ============================
   HEALTH & DEBUG ROUTES
   ============================ */

app.get("/", (_req, res) => {
  res.status(200).send("Staff Server running");
});

app.get("/_int/health", (_req, res) => {
  res.json({
    ok: runtimeState.envValid && runtimeState.dbConnected,
    envValid: runtimeState.envValid,
    dbConnected: runtimeState.dbConnected,
    missingEnv: runtimeState.missingEnv,
  });
});

/* ============================
   START SERVER IMMEDIATELY
   ============================ */

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Staff Server listening on port ${PORT}`);
});

/* ============================
   ASYNC INIT (AFTER LISTEN)
   ============================ */

initDb();
