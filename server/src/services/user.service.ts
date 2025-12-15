import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { AuthenticatedUser } from "../auth/auth.types";

type UserRecord = typeof users.$inferSelect;

function toAuthenticated(user: UserRecord): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role as AuthenticatedUser["role"],
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  const customFinder = (db as any).findUserByEmail;
  if (typeof customFinder === "function") {
    return customFinder(normalizedEmail);
  }
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });
  return user ?? null;
}

export async function findUserById(id: string) {
  const customFinder = (db as any).findUserById;
  if (typeof customFinder === "function") {
    return customFinder(id);
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return user ?? null;
}

export function mapAuthenticated(user: UserRecord | null): AuthenticatedUser | null {
  return user ? toAuthenticated(user) : null;
}
