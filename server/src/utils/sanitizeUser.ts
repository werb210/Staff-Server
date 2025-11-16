import { StoredUser, PublicUser } from "../types/user.js";

/**
 * Ensures that the user object returned to the client
 * does NOT contain sensitive fields like passwordHash.
 *
 * Also normalizes optional fields so TypeScript
 * does not throw type errors.
 */
export function sanitizeUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name || "Unknown User",
    silos: user.silos || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default sanitizeUser;
