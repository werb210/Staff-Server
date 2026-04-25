import express from "express";
import { pool } from "../../db.js";
import { safeHandler } from "../../middleware/safeHandler.js";
import { respondOk } from "../../utils/respondOk.js";

const router = express.Router({ mergeParams: true });

router.get("/", safeHandler(async (req: any, res: any) => {
  const { contactId, companyId } = resolveScope(req);
  const silo = (req.user?.silo ?? "BF").toString().toUpperCase();
  const where: string[] = ["n.silo = $1"];
  const params: unknown[] = [silo];
  if (contactId) { params.push(contactId); where.push(`n.contact_id = $${params.length}`); }
  if (companyId) { params.push(companyId); where.push(`n.company_id = $${params.length}`); }
  const { rows } = await pool.query(
    `SELECT n.*, u.first_name || ' ' || u.last_name AS owner_name
     FROM crm_notes n LEFT JOIN users u ON u.id = n.owner_id
     WHERE ${where.join(" AND ")} ORDER BY n.created_at DESC LIMIT 200`,
    params,
  );
  respondOk(res, rows);
}));

router.post("/", safeHandler(async (req: any, res: any) => {
  const { contactId, companyId } = resolveScope(req);
  const body = (req.body?.body ?? "").toString().trim();
  if (!body) return res.status(400).json({ error: "body required" });
  const silo = (req.user?.silo ?? "BF").toString().toUpperCase();
  const { rows } = await pool.query(
    `INSERT INTO crm_notes (body, owner_id, contact_id, company_id, silo)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [body, req.user?.id ?? req.user?.userId ?? null, contactId, companyId, silo],
  );
  res.status(201).json({ ok: true, data: rows[0] });
}));

function resolveScope(req: any): { contactId: string | null; companyId: string | null } {
  const isContact = req.baseUrl?.includes("/contacts/");
  const id = req.params.id;
  return isContact ? { contactId: id, companyId: req.body?.companyId ?? null }
    : { companyId: id, contactId: req.body?.contactId ?? null };
}

export default router;
