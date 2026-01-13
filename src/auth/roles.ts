export const ROLES = {
  ADMIN: "Admin",
  STAFF: "Staff",
  LENDER: "Lender",
  REFERRER: "Referrer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const roleSet = new Set(Object.values(ROLES));
const roleByLowercase = new Map(
  Object.values(ROLES).map((role) => [role.toLowerCase(), role])
);

export function isRole(value: string): value is Role {
  return roleSet.has(value as Role);
}

export function normalizeRole(value: string): Role | null {
  return roleByLowercase.get(value.trim().toLowerCase()) ?? null;
}
