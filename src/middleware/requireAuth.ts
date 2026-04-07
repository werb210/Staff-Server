import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";
import { fail } from "../lib/response";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const rid = req.id ?? req.rid;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json(fail("Unauthorized", rid));
  }

  const token = auth.split(" ")[1];

  if (!token) {
    return res.status(401).json(fail("Unauthorized", rid));
  }
  const { JWT_SECRET } = getEnv();

  if (!JWT_SECRET) {
    return res.status(401).json(fail("Unauthorized", rid));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded as Request["user"];
    return next();
  } catch {
    return res.status(401).json(fail("Unauthorized", rid));
  }
}

export default requireAuth;
