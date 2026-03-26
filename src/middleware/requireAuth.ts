import jwt, { type JwtPayload } from "jsonwebtoken";

interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user?: JwtPayload & { id?: string; userId?: string; sub?: string };
}

export function requireAuth(req: AuthenticatedRequest, res: any, next: any) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const token = auth.slice("Bearer ".length).trim();
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload & { id?: string; userId?: string; sub?: string };
    req.user = {
      ...decoded,
      id: decoded.id ?? (typeof decoded.userId === "string" ? decoded.userId : undefined) ?? (typeof decoded.sub === "string" ? decoded.sub : undefined),
    };
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}
