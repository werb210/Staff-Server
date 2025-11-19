// server/src/controllers/productsController.ts
import type { Request, Response } from "express";

// Temporary stub controller now that Drizzle has been removed.
// These endpoints just return 501 until Prisma-based versions are wired up.
export const productController = {
  async list(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Products list endpoint not implemented. Drizzle has been removed.",
    });
  },

  async get(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Products get endpoint not implemented. Drizzle has been removed.",
    });
  },

  async create(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Products create endpoint not implemented. Drizzle has been removed.",
    });
  },

  async update(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Products update endpoint not implemented. Drizzle has been removed.",
    });
  },

  async remove(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Products remove endpoint not implemented. Drizzle has been removed.",
    });
  },
};
