import { type CookieOptions, type NextFunction, type Request, type Response } from "express";
import { isProductionEnvironment, isTestEnvironment } from "../config";

function isLoopback(req: Request): boolean {
  const ip = req.ip || "";
  return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("::ffff:127.0.0.1");
}

function isAzureHttps(req: Request): boolean {
  // Azure sets one or more of these when TLS is terminated upstream
  return (
    req.secure === true ||
    req.get("x-forwarded-proto") === "https" ||
    typeof req.get("x-arr-ssl") === "string"
  );
}

export function requireHttps(req: Request, res: Response, next: NextFunction): void {
  if (!isProductionEnvironment()) return next();

  // Always allow internal routes (health/ready) and loopback
  if (req.path.startsWith("/api/_int") || isLoopback(req)) return next();

  if (!isAzureHttps(req)) {
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
  if (isTestEnvironment()) return next();

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
