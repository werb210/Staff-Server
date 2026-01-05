import { type CookieOptions, type NextFunction, type Request, type Response } from "express";
import { isProductionEnvironment, isTestEnvironment } from "../config";

const INTERNAL_PREFIX = "/api/_int";

export function requireHttps(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Never block Azure health probes or internal routes
  if (req.path.startsWith(INTERNAL_PREFIX)) {
    next();
    return;
  }

  if (!isProductionEnvironment()) {
    next();
    return;
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const isSecure = req.secure || forwardedProto === "https";

  if (!isSecure) {
    res.status(400).json({
      code: "https_required",
      message: "HTTPS is required.",
      requestId: res.locals.requestId ?? "unknown",
    });
    return;
  }

  next();
}

export function enforceSecureCookies(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isTestEnvironment()) {
    next();
    return;
  }

  const original = res.cookie.bind(res);
  res.cookie = (name: string, value: unknown, options: CookieOptions = {}) => {
    const merged: CookieOptions = {
      ...options,
      secure: true,
      sameSite: "strict",
    };
    return original(name, value, merged);
  };

  next();
}
