import type { NextFunction, Request, Response } from "express";

const aliasMap: Record<string, string> = {
  "/dialer/token": "/api/voice/token",
  "/call/start": "/api/call/start",
  "/auth": "/api/auth",
  "/crm": "/api/crm",
  "/maya": "/api/maya",
  "/voice": "/api/voice",
  "/call": "/api/call",
};

const aliasKeys = Object.keys(aliasMap).sort((a, b) => b.length - a.length);

export function routeAlias(req: Request, _res: Response, next: NextFunction) {
  if (!req.url.startsWith("/api")) {
    for (const key of aliasKeys) {
      if (req.url.startsWith(key)) {
        req.url = req.url.replace(key, aliasMap[key]);
        break;
      }
    }
  }

  next();
}

export default routeAlias;
