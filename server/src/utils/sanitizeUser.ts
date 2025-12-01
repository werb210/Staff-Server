/**
 * Remove password, tokens, and other sensitive fields from user records before
 * returning them to API consumers.
 */
export function sanitizeUser<
  T extends { password?: unknown; passwordHash?: unknown },
>(user: T | null): Omit<T, "password" | "passwordHash"> | null {
  if (!user) return null as null;

  const { password: _password, passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
