// server/src/utils/userUtils.ts
import { sanitizeUser } from "./sanitizeUser.js";
import type { AuthUser, Role, SiloAccess } from "../types/user.js";
import { ROLE_VALUES } from "../types/user.js";

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && ROLE_VALUES.includes(value.toUpperCase() as Role);

export const normalizeRole = (value?: string | null): Role | null => {
  if (!value) return null;
  const upper = value.toUpperCase();
  return isRole(upper) ? (upper as Role) : null;
};

export const normalizeSiloAccess = (
  siloAccess: unknown,
  fallbackRole?: Role | null,
  mergeWith: SiloAccess = {},
): SiloAccess => {
  const normalized: SiloAccess = { ...mergeWith };

  if (siloAccess && typeof siloAccess === "object") {
    for (const [silo, details] of Object.entries(siloAccess as Record<string, any>)) {
      const role = normalizeRole((details as any)?.role);
      normalized[silo] = role ? { role } : null;
    }
  }

  if (Object.keys(normalized).length === 0 && fallbackRole) {
    normalized.default = { role: fallbackRole };
  }

  return normalized;
};

export const extractRoles = (siloAccess: SiloAccess): Role[] => {
  const roles = Object.values(siloAccess ?? {})
    .map((entry) => entry?.role)
    .filter((role): role is Role => Boolean(role));

  return Array.from(new Set(roles));
};

export const toSafeUser = (record: any): Omit<AuthUser, "roles"> | null => {
  const sanitized = sanitizeUser(record);
  if (!sanitized) return null;

  const siloAccess = normalizeSiloAccess((record as any)?.siloAccess ?? {});
  return {
    ...(sanitized as any),
    siloAccess,
  } as Omit<AuthUser, "roles">;
};

export const toAuthUser = (record: any): AuthUser | null => {
  const user = toSafeUser(record);
  if (!user) return null;

  const roles = extractRoles(user.siloAccess);
  return { ...user, roles };
};
