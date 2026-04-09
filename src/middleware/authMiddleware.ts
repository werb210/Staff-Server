import { Request, Response, NextFunction } from 'express';

const PUBLIC_PATHS = [
  "/api/otp/start",
  "/api/otp/verify",
  "/api/auth/otp/start",
  "/api/auth/otp/verify",
  "/api/public",
  "/health",
];

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (PUBLIC_PATHS.some((pathPrefix) => req.path.startsWith(pathPrefix))) {
    return next();
  }

  // placeholder auth — replace later
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
