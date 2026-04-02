import type { Request, Response } from "express";
import { fail, ok } from "./response";

export function wrap(handler: (req: Request, res: Response) => Promise<any> | any) {
  return async (req: Request, res: Response) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) {
        res.json(ok(result, (req as Request & { rid?: string }).rid));
      }
    } catch (err: any) {
      if (!res.headersSent) {
        const status = err.status || 500;
        if (status === 429) {
          res.setHeader("Retry-After", "1");
        }
        res.status(status).json(fail(err, (req as Request & { rid?: string }).rid));
      }
    }
  };
}
