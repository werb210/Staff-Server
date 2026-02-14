import { Router } from "express";
import { db } from "../db";

const router = Router();

router.post("/continuation", async (req, res) => {
  const { email, phone, fullName, companyName, prefill } = req.body as {
    email?: string;
    phone?: string;
    fullName?: string;
    companyName?: string;
    prefill?: Record<string, unknown>;
  };

  const result = await db.query(
    `
      insert into continuation_sessions (email, phone, full_name, company_name, prefill)
      values ($1, $2, $3, $4, $5::jsonb)
      returning *
    `,
    [email ?? null, phone ?? null, fullName ?? null, companyName ?? null, JSON.stringify(prefill ?? {})]
  );

  res.json(result.rows[0]);
});

router.get("/continuation/session", async (req, res) => {
  const emailHeader = req.headers["x-user-email"];
  const email = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader;

  if (!email) {
    res.json(null);
    return;
  }

  const result = await db.query(
    `
      select *
      from continuation_sessions
      where email = $1
      order by created_at desc
      limit 1
    `,
    [email]
  );

  res.json(result.rows[0] ?? null);
});

export default router;
