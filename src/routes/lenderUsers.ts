// BF_SERVER_BLOCK_v106_LENDER_PORTAL_BACKEND_v1
// Admin endpoint: create / list users tied to a specific lender.

import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAuthorization } from "../middleware/auth.js";
import { ROLES } from "../auth/roles.js";
import { AppError } from "../middleware/errors.js";
import { pool } from "../db.js";

const router = Router();

const createSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(7),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  silo: z.enum(["BF", "BI", "SLF"]).default("BI"),
});

router.get(
  "/lenders/:lenderId/users",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  async (req: any, res: any, next: any) => {
    try {
      const lenderId = String(req.params.lenderId || "");
      const { rows } = await pool.query(
        `SELECT id, email, phone, first_name, last_name, role, status,
                disabled, active, is_active, created_at, last_login_at
           FROM users
          WHERE lender_id = $1
          ORDER BY created_at DESC`,
        [lenderId]
      );
      res.json({ items: rows });
    } catch (err) { next(err); }
  }
);

router.post(
  "/lenders/:lenderId/users",
  requireAuth,
  requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }),
  async (req: any, res: any, next: any) => {
    try {
      const lenderId = String(req.params.lenderId || "");
      const input = createSchema.parse(req.body);
      const lenderCheck = await pool.query(`SELECT id FROM lenders WHERE id = $1`, [lenderId]);
      if (lenderCheck.rowCount === 0) throw new AppError("not_found", "Lender not found.", 404);
      const { rows } = await pool.query(
        `INSERT INTO users (email, phone, first_name, last_name, role, silo, lender_id,
                            disabled, active, is_active, status)
         VALUES ($1, $2, $3, $4, 'Lender', $5, $6, false, true, true, 'ACTIVE')
         ON CONFLICT (email) DO UPDATE
            SET phone      = EXCLUDED.phone,
                first_name = COALESCE(users.first_name, EXCLUDED.first_name),
                last_name  = COALESCE(users.last_name,  EXCLUDED.last_name),
                lender_id  = EXCLUDED.lender_id,
                role       = 'Lender',
                disabled   = false,
                active     = true,
                is_active  = true,
                status     = 'ACTIVE',
                updated_at = now()
         RETURNING id, email, phone, first_name, last_name, role, lender_id`,
        [input.email, input.phone, input.first_name ?? null, input.last_name ?? null, input.silo, lenderId]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err && typeof err === "object" && "name" in err && (err as any).name === "ZodError") {
        return res.status(400).json({ code: "validation_error", message: "Invalid request payload." });
      }
      next(err);
    }
  }
);

export default router;
