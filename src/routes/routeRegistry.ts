import { ROLES, type Role } from "../auth/roles";

export type ApiRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  roles: Role[];
};

const ALL_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.STAFF,
  ROLES.LENDER,
  ROLES.REFERRER,
];

export const ROUTES: ApiRoute[] = [
  { method: "POST", path: "/api/auth/otp/start", roles: ALL_ROLES },
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
