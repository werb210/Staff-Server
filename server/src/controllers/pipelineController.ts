// server/src/controllers/pipelineController.ts
import type { Request, Response } from "express";
import { db } from "../db/registry.js";
import { pipeline } from "../db/schema/pipeline.js";
import { eq } from "drizzle-orm";

export const pipelineController = {
  async list(_req: Request, res: Response) {
    const rows = await db.select().from(pipeline);
    res.json({ ok: true, data: rows });
  },

  async get(req: Request, res: Response) {
    const row = await db.query.pipeline.findFirst({
      where: eq(pipeline.id, req.params.id),
    });
    if (!row) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const inserted = await db.insert(pipeline).values(req.body).returning();
    res.json({ ok: true, data: inserted[0] });
  },

  async update(req: Request, res: Response) {
    const updated = await db
      .update(pipeline)
      .set(req.body)
      .where(eq(pipeline.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated[0] });
  },

  async remove(req: Request, res: Response) {
    await db.delete(pipeline).where(eq(pipeline.id, req.params.id));
    res.json({ ok: true });
  },
};
