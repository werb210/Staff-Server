export const Roles = {
  Admin: "admin",
  Staff: "staff",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const permissions = {
  userAdmin: [Roles.Admin],
  staffRoutes: [Roles.Staff],
  auditRoutes: [Roles.Admin],
  passwordReset: [Roles.Admin, Roles.Staff],
} as const satisfies Record<string, readonly Role[]>;
