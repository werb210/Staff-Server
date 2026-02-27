import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { randomUUID as uuid } from "crypto";
import { getCorsAllowlist } from "../config/env";

function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  const allowlist = new Set(getCorsAllowlist());

  if (origin && allowlist.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    const requestedMethod = req.get("Access-Control-Request-Method");
    if (requestedMethod) {
      const requestedHeaders = req.get("Access-Control-Request-Headers") ?? "content-type";
      res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.set("Access-Control-Allow-Headers", requestedHeaders);
      res.status(204).send();
      return;
    }
  }

  next();
}

function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers["x-request-id"];
  const requestId = typeof headerId === "string" && headerId.trim().length > 0 ? headerId : uuid();
  res.setHeader("x-request-id", requestId);
  res.locals.requestId = requestId;
  req.requestId = requestId;
  next();
}

function internalRouteGuard(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  if (origin && req.path.startsWith("/api/_int")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function applyMiddleware(app: Express): void {
  app.use(express.json());
  app.use(corsMiddleware);
  app.use(requestIdMiddleware);
  app.use(internalRouteGuard);
}
