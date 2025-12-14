import { Router } from "express";
import { Client } from "pg";

const router = Router();

router.get("/db", async (_req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();

    res.status(200).json({ db: "ok" });
  } catch (err: any) {
    res.status(500).json({
      db: "error",
      message: err?.message ?? "db failure",
    });
  }
});

export default router;
