/**
 * Extracts the active silo from the request and attaches it to res.locals.
 * Priority: X-Silo header > ?silo= query param > body.silo > 'BF' (default)
 */
import type { Request, Response, NextFunction } from "express";

const VALID_SILOS = new Set(["BF", "BI", "SLF"]);

function normalizeSilo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return VALID_SILOS.has(upper) ? upper : null;
}

export function siloMiddleware(req: Request, res: Response, next: NextFunction): void {
  const silo =
    normalizeSilo(req.header("x-silo")) ??
    normalizeSilo(req.query.silo) ??
    normalizeSilo((req.body as Record<string, unknown>)?.silo) ??
    "BF";
  res.locals.silo = silo;
  next();
}

export function getSilo(res: Response): string {
  return typeof res.locals.silo === "string" ? res.locals.silo : "BF";
}
