import { type CookieOptions, type NextFunction, type Request, type Response } from "express";
import { isProductionEnvironment, isTestEnvironment } from "../config";

const HEALTH_CHECK_PATH = "/api/_int/health";
const ROBOTS_TXT_PATH = /^\/robots.*\.txt$/;

export function requireHttps(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Never block Azure health probes.
  if (req.path === HEALTH_CHECK_PATH || req.path === "/" || ROBOTS_TXT_PATH.test(req.path)) {
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
