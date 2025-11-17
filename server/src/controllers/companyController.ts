// server/src/controllers/companyController.ts
import { db } from "../db/registry.js";
import { companies } from "../db/schema/companies.js";
import { eq } from "drizzle-orm";

export const companyController = {
  async list(_req, res) {
    const rows = await db.select().from(companies);
    res.json({ ok: true, data: rows });
  },

  async get(req, res) {
    const row = await db.query.companies.findFirst({
      where: eq(companies.id, req.params.id),
    });
    if (!row) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: row });
  },

  async create(req, res) {
    const inserted = await db.insert(companies).values(req.body).returning();
    res.json({ ok: true, data: inserted[0] });
  },

  async update(req, res) {
    const updated = await db
      .update(companies)
      .set(req.body)
      .where(eq(companies.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated[0] });
  },

  async remove(req, res) {
    await db.delete(companies).where(eq(companies.id, req.params.id));
    res.json({ ok: true });
  },
};
