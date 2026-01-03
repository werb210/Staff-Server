export type Role = "admin" | "staff" | "user";

export const ROLES = {
  ADMIN: "admin" as Role,
  STAFF: "staff" as Role,
  USER: "user" as Role,
};

export const permissions: Record<string, Role[]> = {
  userAdmin: [ROLES.ADMIN],
  staffRoutes: [ROLES.STAFF],
  auditRoutes: [ROLES.ADMIN],
  passwordReset: [ROLES.ADMIN, ROLES.STAFF],
};
