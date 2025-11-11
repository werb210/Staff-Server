import type { NextFunction, Request, Response } from "express";

const NON_AUTH_ROUTES = [
  /^\/api\/health/,
  /^\/api\/auth\/passkey/,
  /^\/api\/_int\/health/,
  /^\/api\/_int\/build-guard/,
];

const shouldSkipAuth = (baseUrl: string, path: string): boolean => {
  const fullPath = `${baseUrl}${path}`;
  return NON_AUTH_ROUTES.some((pattern) => pattern.test(fullPath));
};

export const authenticateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (shouldSkipAuth(req.baseUrl, req.path)) {
    return next();
  }

  if (!req.silo) {
    return res.status(500).json({ message: "Silo context missing" });
  }

  try {
    const session = req.silo.auth.ensureAuthenticated(req.headers);
    req.session = session;
    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return res.status(401).json({ message, silo: req.silo.silo });
  }
};
