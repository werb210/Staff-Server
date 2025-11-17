// server/src/controllers/lenderController.ts
import { db } from "../db/registry.js";
import { lenders } from "../db/schema/lenders.js";
import { eq } from "drizzle-orm";

export const lenderController = {
  async list(_req, res) {
    const rows = await db.select().from(lenders);
    res.json({ ok: true, data: rows });
  },

  async get(req, res) {
    const row = await db.query.lenders.findFirst({
      where: eq(lenders.id, req.params.id),
    });
    if (!row) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: row });
  },

  async create(req, res) {
    const inserted = await db.insert(lenders).values(req.body).returning();
    res.json({ ok: true, data: inserted[0] });
  },

  async update(req, res) {
    const updated = await db
      .update(lenders)
      .set(req.body)
      .where(eq(lenders.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated[0] });
  },

  async remove(req, res) {
    await db.delete(lenders).where(eq(lenders.id, req.params.id));
    res.json({ ok: true });
  },
};
