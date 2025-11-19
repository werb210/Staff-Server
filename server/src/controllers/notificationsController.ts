// server/src/controllers/notificationController.ts
import type { Request, Response } from "express";
import { db } from "../db/registry.js";
import { notifications } from "../db/schema/notifications.js";
import { eq } from "drizzle-orm";

export const notificationsController = {
  async list(_req: Request, res: Response) {
    const rows = await db.select().from(notifications);
    res.json({ ok: true, data: rows });
  },

  async get(req: Request, res: Response) {
    const row = await db.query.notifications.findFirst({
      where: eq(notifications.id, req.params.id),
    });
    if (!row) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const inserted = await db
      .insert(notifications)
      .values(req.body)
      .returning();
    res.json({ ok: true, data: inserted[0] });
  },

  async update(req: Request, res: Response) {
    const updated = await db
      .update(notifications)
      .set(req.body)
      .where(eq(notifications.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated[0] });
  },

  async remove(req: Request, res: Response) {
    await db.delete(notifications).where(eq(notifications.id, req.params.id));
    res.json({ ok: true });
  },
};
