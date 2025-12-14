import express from "express";
import { Pool } from "pg";

const app = express();
const port = process.env.PORT || 8080;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * ROOT ROUTE — REQUIRED FOR AZURE
 */
app.get("/", (_req, res) => {
  res.status(200).send("Staff Server OK");
});

/**
 * HEALTH CHECK — REQUIRED FOR PRODUCTION
 */
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error("❌ Health check DB failure:", err);
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

/**
 * STARTUP DB VERIFICATION — NO MORE SILENT FAILURES
 */
async function verifyDatabase() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connection verified");
  } catch (err) {
    console.error("❌ Database connection failed at startup:", err);
    process.exit(1);
  }
}

verifyDatabase().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Staff Server running on port ${port}`);
  });
});
