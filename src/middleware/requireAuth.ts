import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../auth/jwt";
import { db } from "../db";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const token = auth.slice(7);
  const payload = verifyJwt(token);

  const { rows } = await db.query(
    `
    SELECT id, role, status, silo
    FROM users
    WHERE id = $1
    `,
    [payload.sub]
  );

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ ok: false, error: "invalid_user" });
  }

  if (user.status !== "active") {
    return res.status(403).json({ ok: false, error: "user_disabled" });
  }

  req.user = {
    userId: user.id,
    role: user.role,
    silo: user.silo,
    siloFromToken: false,
    capabilities: [],
  };

  next();
}
