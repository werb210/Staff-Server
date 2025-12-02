// server/src/utils/sanitizeUser.ts
export function sanitizeUser<T extends { password?: any; passwordHash?: any }>(
  user: T | null
) {
  if (!user) return null;

  const { password, passwordHash, ...safe } = user as any;
  return safe;
}
