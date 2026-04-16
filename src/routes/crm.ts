import { Router } from "express";
import { requireAuth, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../auth/capabilities.js";
import { safeHandler } from "../middleware/safeHandler.js";
import { respondOk } from "../utils/respondOk.js";
import { handleListCrmTimeline } from "../modules/crm/timeline.controller.js";
import { SupportController } from "../modules/support/support.controller.js";
import { pool } from "../db.js";

const router = Router();

// Public website lead intake endpoint
router.post("/web-leads", SupportController.createWebLead);

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.CRM_READ]));

router.get("/", safeHandler((_req: any, res: any) => {
  respondOk(res, {
    customers: [],
    contacts: [],
    totalCustomers: 0,
    totalContacts: 0,
  });
}));

router.get("/customers", safeHandler((req: any, res: any) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 25;
  respondOk(
    res,
    {
      customers: [],
      total: 0,
    },
    {
      page,
      pageSize,
    }
  );
}));

router.get("/contacts", safeHandler(async (req: any, res: any) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 25, 100);
  const offset = (page - 1) * pageSize;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : null;

  // Query contacts table (populated via readiness submissions)
  const contactRows = await pool.query(
    `SELECT
       c.id, c.name, c.email, c.phone, c.status,
       c.company_id, c.owner_id, c.created_at,
       'contact' AS source
     FROM contacts c
     ${search ? "WHERE c.name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1" : ""}
     ORDER BY c.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    search ? [`%${search}%`] : []
  ).catch(() => ({ rows: [] }));

  // Also query crm_leads (populated via website lead form and readiness)
  const leadRows = await pool.query(
    `SELECT
       id, full_name AS name, email, phone, null AS status,
       null AS company_id, null AS owner_id, created_at,
       'lead' AS source
     FROM crm_leads
     ${search ? "WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1" : ""}
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    search ? [`%${search}%`] : []
  ).catch(() => ({ rows: [] }));

  const userRows = await pool.query(
    `SELECT
      id,
      COALESCE(NULLIF(trim(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''), email, phone, id::text) AS name,
      email,
      phone,
      status,
      null AS company_id,
      id AS owner_id,
      created_at,
      'user' AS source
     FROM users
     ${search ? "WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1" : ""}
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    search ? [`%${search}%`] : []
  ).catch(() => ({ rows: [] }));

  const combined = [
    ...(contactRows.rows ?? []),
    ...(leadRows.rows ?? []),
    ...(userRows.rows ?? []),
  ]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, pageSize);

  respondOk(res, { contacts: combined, total: combined.length }, { page, pageSize });
}));

router.get("/timeline", safeHandler(handleListCrmTimeline));
router.get("/web-leads", SupportController.fetchWebLeads);

export default router;
