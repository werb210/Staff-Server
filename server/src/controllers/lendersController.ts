// server/src/controllers/lendersController.ts

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

export const lendersController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: [
        { id: "l1", name: "Demo Lender A" },
        { id: "l2", name: "Demo Lender B" },
      ],
    });
  }),
};
