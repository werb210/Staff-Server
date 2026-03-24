import type { Express } from "express";
import leadRoutes from "./modules/lead/lead.routes";
import lenderRoutes from "./modules/lender/lender.routes";

export const API_ROUTE_MOUNTS = [
  { path: "/leads", router: leadRoutes },
  { path: "/lenders", router: lenderRoutes },
] as const;

export function registerApiRouteMounts(app: Express): void {
  for (const mount of API_ROUTE_MOUNTS) {
    app.use(`/api${mount.path}`, mount.router);
  }
}

export function registerRoutes(app: Express): void {
  registerApiRouteMounts(app);
}
