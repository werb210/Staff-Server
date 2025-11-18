import type { User } from "@prisma/client";

/**
 * Remove password, tokens, and other sensitive fields from user records.
 * Always run this before returning any user to the client.
 */
export function sanitizeUser(user: User | null) {
  if (!user) return null;

  const { password, ...safeUser } = user;
  return safeUser;
}
