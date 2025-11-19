// ============================================================================
// server/src/controllers/notificationsController.ts
// Compatible with rewritten Prisma notificationsService
// ============================================================================

import type { Request, Response } from "express";
import notificationsService from "../services/notificationsService.js";

export const notificationsController = {
  async list(req: Request, res: Response) {
    try {
      const userId = req.params.userId || req.query.userId;
      if (!userId) {
        return res.status(400).json({ ok: false, error: "Missing userId" });
      }

      const data = await notificationsService.list(String(userId));
      res.json({ ok: true, data });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const data = await notificationsService.list(req.params.userId);

      const item = data.find((n) => n.id === id);
      if (!item) return res.status(404).json({ ok: false });

      res.json({ ok: true, data: item });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { userId, title, message, type } = req.body;
      if (!userId) {
        return res.status(400).json({ ok: false, error: "Missing userId" });
      }

      const inserted = await notificationsService.create(String(userId), {
        title,
        message,
        type,
      });

      res.json({ ok: true, data: inserted });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id;

      const updated = await notificationsService.markRead(id);
      res.json({ ok: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const id = req.params.id;

      await notificationsService.delete(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  async removeAll(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      if (!userId)
        return res.status(400).json({ ok: false, error: "Missing userId" });

      const result = await notificationsService.deleteAll(userId);
      res.json({ ok: true, data: result });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },
};

// ============================================================================
// END OF FILE
// ============================================================================
