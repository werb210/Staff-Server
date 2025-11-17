// server/src/controllers/productController.ts
import { db } from "../db/registry.js";
import { products } from "../db/schema/products.js";
import { eq } from "drizzle-orm";

export const productController = {
  async list(_req, res) {
    const rows = await db.select().from(products);
    res.json({ ok: true, data: rows });
  },

  async get(req, res) {
    const row = await db.query.products.findFirst({
      where: eq(products.id, req.params.id),
    });
    if (!row) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: row });
  },

  async create(req, res) {
    const inserted = await db.insert(products).values(req.body).returning();
    res.json({ ok: true, data: inserted[0] });
  },

  async update(req, res) {
    const updated = await db
      .update(products)
      .set(req.body)
      .where(eq(products.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated[0] });
  },

  async remove(req, res) {
    await db.delete(products).where(eq(products.id, req.params.id));
    res.json({ ok: true });
  },
};
