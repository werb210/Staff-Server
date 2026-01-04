import { type Role, ROLES } from "./roles";

export const CAPABILITIES = {
  AUTH_SESSION: "auth:session",
  STAFF_OVERVIEW: "staff:overview",
  USER_MANAGE: "user:manage",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

const roleCapabilities: Record<Role, readonly Capability[]> = {
  [ROLES.ADMIN]: [CAPABILITIES.AUTH_SESSION, CAPABILITIES.USER_MANAGE],
  [ROLES.STAFF]: [CAPABILITIES.AUTH_SESSION, CAPABILITIES.STAFF_OVERVIEW],
  [ROLES.USER]: [CAPABILITIES.AUTH_SESSION],
};

export function getCapabilitiesForRole(role: Role): Capability[] {
  return [...(roleCapabilities[role] ?? [])];
}
