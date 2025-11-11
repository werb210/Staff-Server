import type { NextFunction, Request, Response } from "express";
import { resolveSilo } from "../silos/registry.js";
import type { SiloKey } from "../silos/types.js";

const DEFAULT_SILO: SiloKey = "BF";

const getSiloFromRequest = (req: Request): SiloKey => {
  const siloHeader = req.headers["x-silo"] ?? req.headers["x-tenant"];
  if (Array.isArray(siloHeader)) {
    return (siloHeader[0] as SiloKey) ?? DEFAULT_SILO;
  }
  if (typeof siloHeader === "string" && siloHeader.trim()) {
    const upper = siloHeader.trim().toUpperCase();
    if (upper === "BF" || upper === "SLF" || upper === "BI") {
      return upper;
    }
  }
  return DEFAULT_SILO;
};

export const attachSiloContext = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const silo = getSiloFromRequest(req);
  req.silo = resolveSilo(silo);
  next();
};
