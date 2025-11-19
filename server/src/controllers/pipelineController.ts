// server/src/controllers/pipelineController.ts
import type { Request, Response } from "express";

// Temporary stub controller now that Drizzle has been removed.
// These endpoints just return 501 until Prisma-based versions are wired up.
export const pipelineController = {
  async list(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Pipeline list endpoint not implemented. Drizzle has been removed.",
    });
  },

  async get(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Pipeline get endpoint not implemented. Drizzle has been removed.",
    });
  },

  async create(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Pipeline create endpoint not implemented. Drizzle has been removed.",
    });
  },

  async update(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Pipeline update endpoint not implemented. Drizzle has been removed.",
    });
  },

  async remove(_req: Request, res: Response) {
    res.status(501).json({
      ok: false,
      error: "Pipeline remove endpoint not implemented. Drizzle has been removed.",
    });
  },
};
