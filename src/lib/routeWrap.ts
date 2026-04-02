import type { Request, Response } from "express";
import { error, ok } from "./response";

export function routeWrap(handler: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    const rid =
      (req as Request & { id?: string; rid?: string }).id ||
      (req as Request & { id?: string; rid?: string }).rid ||
      (req.headers["x-request-id"] as string | undefined);

    try {
      const result = await handler(req, res);

      if (res.headersSent) return;

      return res.json(ok(result, rid));
    } catch (err: any) {
      console.error("ROUTE ERROR:", err);

      return res.status(err?.status || 500).json(error(err?.message || "Internal error", rid));
    }
  };
}

export const wrap = routeWrap;
