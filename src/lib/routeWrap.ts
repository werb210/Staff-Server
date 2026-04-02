import { Request, Response, NextFunction } from "express";

export function routeWrap(
  handler: (req: Request, res: Response) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rid = (req as any).rid;

    try {
      const data = await handler(req, res);

      res.json({
        status: "ok",
        data,
        rid,
      });
    } catch (err: any) {
      res.status(500).json({
        status: "error",
        error: err.message || "Internal error",
        rid,
      });
    }
  };
}

export const wrap = routeWrap;
