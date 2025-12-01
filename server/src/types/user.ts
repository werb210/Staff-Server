// server/src/types/user.ts

export type Role = "ADMIN" | "STAFF" | "LENDER" | "REFERRER";

export const ROLE_VALUES: Role[] = ["ADMIN", "STAFF", "LENDER", "REFERRER"];

export type SiloAccess = Record<string, { role: Role } | null>;

export interface AuthUser {
  id: string;
  email: string;
  siloAccess: SiloAccess;
  roles: Role[];
  createdAt: string | Date;
  updatedAt: string | Date;
}
