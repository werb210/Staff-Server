import { NextFunction, Request, Response, type RequestHandler } from "express";
import { fail } from "../utils/http/respond";
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

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return fail(res, "Missing auth token", 401, "NO_TOKEN");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return fail(res, "Invalid auth token", 401, "INVALID_TOKEN");
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded as Request["user"];
    return next();
  } catch {
    return fail(res, "Invalid auth token", 401, "INVALID_TOKEN");
  }
}

export function createAuthMiddleware(): RequestHandler {
  return requireAuth;
}

export const authMiddleware: RequestHandler = requireAuth;
export const auth = authMiddleware;

export function requireAuthorization(options: AuthorizationOptions = {}): RequestHandler {
  const requiredRoles = options.roles ?? [];
  const requiredCapabilities = options.capabilities ?? [];

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AppUser | undefined;

    if (!user) {
      return fail(res, "Missing auth token", 401, "NO_TOKEN");
    }

    if (requiredRoles.length > 0 && (!user.role || !requiredRoles.includes(user.role))) {
      return fail(res, "Forbidden", 403, "FORBIDDEN");
    }

    if (requiredCapabilities.length > 0) {
      const userCapabilities = user.capabilities ?? [];
      const allowed = requiredCapabilities.some((capability) => userCapabilities.includes(capability));

      if (!allowed) {
        return fail(res, "Forbidden", 403, "FORBIDDEN");
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
