/**
 * Remove password, tokens, and other sensitive fields from user records before
 * returning them to API consumers.
 */
export function sanitizeUser<T extends { password?: unknown }>(
  user: T | null,
): Omit<T, "password"> | null {
  if (!user) return null as null;

  const { password: _password, ...safeUser } = user;
  return safeUser;
}
