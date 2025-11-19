cat << 'EOF' > server/src/controllers/pipelineController.ts
// server/src/controllers/pipelineController.ts
import type { Request, Response } from "express";

// Temporarily disabled after Drizzle removal
export const pipelineController = {
  async list(_req: Request, res: Response) {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  },

  async get(_req: Request, res: Response) {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  },

  async create(_req: Request, res: Response) {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  },

  async update(_req: Request, res: Response) {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  },

  async remove(_req: Request, res: Response) {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  },
};
EOF
