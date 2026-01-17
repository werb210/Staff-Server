import { type Router } from "express";
import { ROLES, type Role } from "../auth/roles";
import adminRoutes from "./admin";
import applicationsRoutes from "./applications";
import authRoutes from "./auth";
import calendarRoutes from "./calendar";
import clientRoutes from "./client";
import communicationsRoutes from "./communications";
import crmRoutes from "./crm";
import dashboardRoutes from "./dashboard";
import documentsRoutes from "./documents";
import internalRoutes from "./internal";
import lenderRoutes from "./lender";
import lendersRoutes from "./lenders";
import marketingRoutes from "./marketing";
import reportingRoutes from "./reporting";
import reportsRoutes from "./reports";
import settingsRoutes from "./settings";
import staffRoutes from "./staff";
import tasksRoutes from "./tasks";
import usersRoutes from "./users";
import portalRoutes from "./portal";

export type ApiRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  roles: Role[];
};

export type ApiRouteMount = {
  path: string;
  router: Router;
};

const ALL_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.STAFF,
  ROLES.LENDER,
  ROLES.REFERRER,
];

export const API_ROUTE_MOUNTS: ApiRouteMount[] = [
  { path: "/_int", router: internalRoutes },
  { path: "/auth", router: authRoutes },
  { path: "/applications", router: applicationsRoutes },
  { path: "/calendar", router: calendarRoutes },
  { path: "/client", router: clientRoutes },
  { path: "/communications", router: communicationsRoutes },
  { path: "/crm", router: crmRoutes },
  { path: "/dashboard", router: dashboardRoutes },
  { path: "/documents", router: documentsRoutes },
  { path: "/lender", router: lenderRoutes },
  { path: "/lenders", router: lendersRoutes },
  { path: "/admin", router: adminRoutes },
  { path: "/marketing", router: marketingRoutes },
  { path: "/reporting", router: reportingRoutes },
  { path: "/reports", router: reportsRoutes },
  { path: "/settings", router: settingsRoutes },
  { path: "/staff", router: staffRoutes },
  { path: "/tasks", router: tasksRoutes },
  { path: "/users", router: usersRoutes },
  { path: "/portal", router: portalRoutes },
];

export const PORTAL_ROUTE_REQUIREMENTS: Pick<ApiRoute, "method" | "path">[] = [
  { method: "GET", path: "/api/auth/me" },
  { method: "GET", path: "/api/dashboard" },
  { method: "GET", path: "/api/applications" },
  { method: "GET", path: "/api/crm" },
  { method: "GET", path: "/api/calendar" },
  { method: "GET", path: "/api/communications" },
  { method: "GET", path: "/api/marketing" },
  { method: "GET", path: "/api/lenders" },
  { method: "GET", path: "/api/settings" },
];

export const ROUTES: ApiRoute[] = [
  { method: "POST", path: "/api/auth/otp/start", roles: ALL_ROLES },
  { method: "POST", path: "/api/auth/otp/request", roles: ALL_ROLES },
  { method: "POST", path: "/api/auth/otp/verify", roles: ALL_ROLES },
  { method: "POST", path: "/api/auth/start", roles: ALL_ROLES },
  { method: "POST", path: "/api/auth/verify", roles: ALL_ROLES },
  { method: "POST", path: "/api/auth/refresh", roles: ALL_ROLES },
  { method: "POST", path: "/api/auth/logout", roles: ALL_ROLES },
  { method: "POST", path: "/api/auth/logout-all", roles: ALL_ROLES },
  { method: "GET", path: "/api/auth/me", roles: ALL_ROLES },
  { method: "GET", path: "/api/applications", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/crm", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/crm/contacts", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/communications", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/calendar", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/calendar/events", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/tasks", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/marketing", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/lenders", roles: [ROLES.ADMIN] },
  { method: "GET", path: "/api/settings", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/staff/overview", roles: [ROLES.ADMIN, ROLES.STAFF] },
  { method: "GET", path: "/api/dashboard", roles: [ROLES.ADMIN, ROLES.STAFF] },
];

export function registerApiRouteMounts(router: Router): void {
  API_ROUTE_MOUNTS.forEach((entry) => {
    router.use(entry.path, entry.router);
  });
}
