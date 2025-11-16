// server/src/utils/sanitizeUser.ts
import type { User } from "../types/user.js";

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
