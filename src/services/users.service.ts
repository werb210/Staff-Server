import { Request, Response } from "express";
import { db } from "../db";
import { z } from "zod";

/**
 * Schemas
 */
const updateMeSchema = z.object({
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
});

const adminUpdateSchema = z.object({
  role: z.enum(["Admin", "Staff", "Lender", "Referrer"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

/**
 * GET /api/users/me
 */
export async function getMe(req: Request, res: Response) {
  const userId = req.user!.userId;

  const { rows } = await db.query(
    `
    SELECT
      id,
      phone,
      email,
      first_name,
      last_name,
      role,
      status,
      silo,
      created_at,
      updated_at,
      last_login_at
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (!rows[0]) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }

  res.json({ ok: true, user: rows[0] });
}

/**
 * PATCH /api/users/me
 */
export async function updateMe(req: Request, res: Response) {
  const userId = req.user!.userId;
  const input = updateMeSchema.parse(req.body);

  if (Object.keys(input).length === 0) {
    return res.json({ ok: true });
  }

  const fields = [];
  const values: any[] = [];
  let idx = 1;

  for (const [k, v] of Object.entries(input)) {
    fields.push(`${k} = $${idx++}`);
    values.push(v);
  }

  values.push(userId);

  await db.query(
    `
    UPDATE users
    SET ${fields.join(", ")}, updated_at = now()
    WHERE id = $${idx}
    `,
    values
  );

  res.json({ ok: true });
}

/**
 * GET /api/users
 */
export async function listUsers(req: Request, res: Response) {
  const { role, status } = req.query;

  const filters = [];
  const values: any[] = [];
  let idx = 1;

  if (role) {
    filters.push(`role = $${idx++}`);
    values.push(role);
  }

  if (status) {
    filters.push(`status = $${idx++}`);
    values.push(status);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const { rows } = await db.query(
    `
    SELECT
      id,
      phone,
      email,
      first_name,
      last_name,
      role,
      status,
      silo,
      created_at,
      updated_at,
      last_login_at
    FROM users
    ${where}
    ORDER BY created_at DESC
    `,
    values
  );

  res.json({ ok: true, users: rows });
}

/**
 * PATCH /api/users/:id
 */
export async function adminUpdateUser(req: Request, res: Response) {
  const targetId = req.params.id;
  const input = adminUpdateSchema.parse(req.body);

  if (Object.keys(input).length === 0) {
    return res.json({ ok: true });
  }

  const fields = [];
  const values: any[] = [];
  let idx = 1;

  for (const [k, v] of Object.entries(input)) {
    fields.push(`${k} = $${idx++}`);
    values.push(v);
  }

  values.push(targetId);

  const result = await db.query(
    `
    UPDATE users
    SET ${fields.join(", ")}, updated_at = now()
    WHERE id = $${idx}
    `,
    values
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }

  res.json({ ok: true });
}
