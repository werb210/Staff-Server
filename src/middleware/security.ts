import {
  type CookieOptions,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { isProductionEnvironment, isTestEnvironment } from "../config";

export function requireHttps(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Azure Health Check MUST bypass HTTPS enforcement
  if (req.path === "/api/_int/health") {
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
    // DO NOT redirect — Azure treats redirects as failure
    res.status(200).json({
      status: "ok",
      note: "non_https_request_allowed_for_probe",
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
