export const ROLES = {
  ADMIN: "Admin",
  STAFF: "Staff",
  LENDER: "Lender",
  REFERRER: "Referrer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const roleSet = new Set(Object.values(ROLES));

export function isRole(value: string): value is Role {
  return roleSet.has(value as Role);
}
