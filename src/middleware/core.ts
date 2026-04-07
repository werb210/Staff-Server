import type { RequestHandler } from "express";
import { requestId } from "./requestId";
import { productionLogger, requireHttps, securityHeaders } from "./security";

export const coreMiddleware: RequestHandler[] = [
  requestId,
  securityHeaders,
  productionLogger,
  requireHttps,
];
