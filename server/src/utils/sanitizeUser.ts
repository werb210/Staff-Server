import type { User } from "@prisma/client";

/**
 * Remove password, tokens, and other sensitive fields from user records before
 * returning them to API consumers.
 */
export function sanitizeUser(user: User | null): Omit<User, "password"> | null {
  if (!user) return null;

  const { password: _password, ...safeUser } = user;
  return safeUser;
}
