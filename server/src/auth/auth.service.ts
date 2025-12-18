import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { AuthenticatedUser } from "./auth.types";
import { createTokenPair, TokenPair } from "./token.service";

export interface LoginResult {
  user: AuthenticatedUser;
  tokens: TokenPair;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export const authService = {
  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        firstName: users.first_name,
        lastName: users.last_name,
        isActive: users.is_active,
        passwordHash: users.password_hash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      throw new AuthError("Invalid credentials", 401);
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);

    if (!ok) {
      throw new AuthError("Invalid credentials", 401);
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
    };

    const tokens: TokenPair = await createTokenPair(authUser);

    return { user: authUser, tokens };
  },
};
