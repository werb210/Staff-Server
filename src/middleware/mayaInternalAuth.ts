import type { NextFunction, Request, Response } from "express";

export function requireMayaToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const headerValue = req.headers["x-maya-token"];
  const token = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!token || token !== process.env.MAYA_INTERNAL_TOKEN) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  next();
}
