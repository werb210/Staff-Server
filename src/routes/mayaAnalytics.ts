import { Router, Request, Response, NextFunction } from "express";
import { Pool } from "pg";
import jwt from "jsonwebtoken";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    res.status(500).json({ error: "Admin auth misconfigured" });
    return;
  }

  try {
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

router.post("/admin-login", (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    res.status(500).json({ error: "Admin auth misconfigured" });
    return;
  }

  const token = jwt.sign(
    { role: "admin" },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
});

router.get("/maya-analytics", authenticateAdmin, async (_req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM maya_leads");

    const today = await pool.query(
      `SELECT COUNT(*) FROM maya_leads
       WHERE created_at >= CURRENT_DATE`
    );

    const byReferral = await pool.query(
      `SELECT referral_code, COUNT(*)
       FROM maya_leads
       GROUP BY referral_code
       ORDER BY COUNT(*) DESC`
    );

    const bySource = await pool.query(
      `SELECT utm_source, COUNT(*)
       FROM maya_leads
       GROUP BY utm_source
       ORDER BY COUNT(*) DESC`
    );

    const crmStatus = await pool.query(
      `SELECT
         SUM(CASE WHEN crm_status='sent' THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN crm_status='failed' THEN 1 ELSE 0 END) AS failed
       FROM maya_leads`
    );

    res.json({
      total: Number(total.rows[0]?.count ?? 0),
      today: Number(today.rows[0]?.count ?? 0),
      referralBreakdown: byReferral.rows,
      sourceBreakdown: bySource.rows,
      crmStatus: crmStatus.rows[0] ?? { sent: 0, failed: 0 },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Analytics failure" });
  }
});

export default router;
