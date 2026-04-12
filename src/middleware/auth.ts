import { Request, Response, NextFunction, type RequestHandler } from "express";
import jwt from "jsonwebtoken";

type AuthorizationOptions = {
  roles?: string[];
  capabilities?: string[];
};

type AppUser = NonNullable<Request["user"]> & {
  role?: string;
  capabilities?: string[];
};

export interface AuthRequest extends Request {
  user?: Request["user"];
}

function readBearerToken(value: string | undefined): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function readCookieToken(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  if (!cookies) return null;

  return (
    cookies.accessToken ??
    cookies.authToken ??
    cookies.token ??
    cookies.jwt ??
    null
  );
}

function getToken(req: Request): string | null {
  const authHeader = typeof req.headers.authorization === "string"
    ? req.headers.authorization
    : undefined;

  return (
    readBearerToken(authHeader) ??
    (typeof req.headers["x-access-token"] === "string" ? req.headers["x-access-token"] : null) ??
    readCookieToken(req)
  );
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return res.status(500).json({ status: "error", message: "Auth not configured" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    (req as any).user.userId = (decoded as any).id ?? (decoded as any).sub ?? null;

    next();
  } catch {
    return res.status(401).json({ status: "error", message: "Invalid token" });
  }
}

export const requireAuth: RequestHandler = auth;

export function createAuthMiddleware(): RequestHandler {
  return requireAuth;
}

export const authMiddleware: RequestHandler = requireAuth;

export function requireAuthorization(options: AuthorizationOptions = {}): RequestHandler {
  const requiredRoles = options.roles ?? [];
  const requiredCapabilities = options.capabilities ?? [];

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AppUser | undefined;

    if (!user) {
      return res.status(401).json({ status: "error", error: "NO_TOKEN" });
    }

    if (requiredRoles.length > 0 && (!user.role || !requiredRoles.includes(user.role))) {
      return res.status(403).json({ status: "error", error: "FORBIDDEN" });
    }

    if (requiredCapabilities.length > 0) {
      const userCapabilities = user.capabilities ?? [];
      const allowed = requiredCapabilities.some((capability) => userCapabilities.includes(capability));

      if (!allowed) {
        return res.status(403).json({ status: "error", error: "FORBIDDEN" });
      }
    }

    return next();
  };
}

export function requireCapability(capability: string | string[]): RequestHandler {
  return requireAuthorization({
    capabilities: Array.isArray(capability) ? capability : [capability],
  });
}
