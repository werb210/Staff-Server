export const ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
  USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES = Object.values(ROLES) as Role[];

export const permissions: Record<string, Role[]> = {
  userAdmin: [ROLES.ADMIN],
  staffRoutes: [ROLES.STAFF],
  auditRoutes: [ROLES.ADMIN],
  passwordReset: [ROLES.ADMIN, ROLES.STAFF],
};

const roleSet = new Set(Object.values(ROLES));

export function isRole(value: string): value is Role {
  return roleSet.has(value as Role);
}
