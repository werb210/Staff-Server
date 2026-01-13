export const ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
  LENDER: "lender",
  REFERRER: "referrer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const roleSet = new Set(Object.values(ROLES));

export function isRole(value: string): value is Role {
  return roleSet.has(value as Role);
}
